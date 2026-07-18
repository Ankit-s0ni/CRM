import { HttpException, Injectable } from '@nestjs/common';
import {
  EventType,
  LocationMethod,
  Prisma,
  PunchSource,
  VerificationStatus,
  VerificationType,
} from '@prisma/client';
import {
  PrismaService,
  PrismaTransaction,
} from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { AttendanceContextService } from '../attendance/application/attendance-context.service';
import { AttendanceRuntimeService } from '../attendance/application/attendance-runtime.service';
import { networkIncludesAddress } from '../attendance-config/attendance-config.rules';
import { PrivateEvidenceStorageService } from '../biometrics/private-evidence-storage.service';
import { SecurityAlertEvaluatorService } from '../security-alerts/security-alert-evaluator.service';
import {
  DeviceIntegrityChallengeDto,
  PunchEvidencePresignDto,
  VerifiedPunchDto,
} from './dto/verified-punch.dto';
import {
  DeviceIntegrityProvider,
  FaceMatchProvider,
  IntegrityVerdict,
} from './verification-providers';
import { DeviceIntegrityChallengeService } from './device-integrity-challenge.service';

type FailureCode =
  | 'DEVICE_NOT_REGISTERED'
  | 'DEVICE_PENDING_APPROVAL'
  | 'DEVICE_BLOCKED'
  | 'DEVICE_NOT_OWNED'
  | 'INTEGRITY_FAILED'
  | 'ROOTED_DEVICE'
  | 'MOCK_LOCATION'
  | 'CLOCK_TAMPER'
  | 'GPS_ACCURACY_TOO_LOW'
  | 'LOCATION_REQUIRED'
  | 'NO_OFFICE_ASSIGNED'
  | 'OUTSIDE_GEOFENCE'
  | 'CONSENT_MISSING'
  | 'FACE_NOT_ENROLLED'
  | 'LIVENESS_FAILED'
  | 'FACE_MISMATCH'
  | 'FACE_ATTEMPTS_EXCEEDED'
  | 'VERIFICATION_PROVIDER_UNAVAILABLE';

type CheckResult = {
  check: string;
  passed: boolean;
  skipped?: boolean;
  code?: FailureCode;
  evidence: Record<string, unknown>;
};

type VerificationOutcome = {
  passed: boolean;
  checks: CheckResult[];
  code?: FailureCode;
  details: Record<string, unknown>;
  deviceId?: string;
  integrity?: IntegrityVerdict;
  locationMethod: LocationMethod;
  matchedOfficeId?: string;
  distanceMeters?: number;
  faceScore?: number;
  livenessOk?: boolean;
};

export type VerificationExecutionOptions = {
  offline?: boolean;
  timeSuspect?: boolean;
  clockSkewSeconds?: number;
};

@Injectable()
export class AttendanceVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly attendanceContext: AttendanceContextService,
    private readonly runtime: AttendanceRuntimeService,
    private readonly outbox: OutboxService,
    private readonly integrity: DeviceIntegrityProvider,
    private readonly faces: FaceMatchProvider,
    private readonly storage: PrivateEvidenceStorageService,
    private readonly alerts: SecurityAlertEvaluatorService,
    private readonly integrityChallenges: DeviceIntegrityChallengeService,
  ) {}

  createIntegrityChallenge(dto: DeviceIntegrityChallengeDto) {
    return this.integrityChallenges.create(dto);
  }

  presignEvidence(dto: PunchEvidencePresignDto) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.attendanceContext.employeeForUser(
        tx,
        this.requireUserId(),
      );
      return {
        data: await this.storage.presignPunch(
          tenantId,
          employee.id,
          dto.filename,
          dto.contentType,
          dto.fileSize,
        ),
      };
    });
  }

  async punch(
    dto: VerifiedPunchDto,
    request: { ipAddress?: string; userAgent?: string; jwtDeviceId?: string },
  ) {
    const result = await this.prisma.forTenant((tx) =>
      this.punchInTransaction(tx, dto, request),
    );

    if ('error' in result && result.error) {
      throw new HttpException(
        {
          code: result.error,
          message: failureMessage(result.error),
          details: result.details,
        },
        failureStatus(result.error),
      );
    }
    return result;
  }

  async punchInTransaction(
    tx: PrismaTransaction,
    dto: VerifiedPunchDto,
    request: { ipAddress?: string; userAgent?: string; jwtDeviceId?: string },
    options: VerificationExecutionOptions = {},
  ) {
    const clientTime = new Date(dto.clientTime);
    const employee = await this.attendanceContext.employeeForUser(
      tx,
      this.requireUserId(),
    );
    const runtime = await this.attendanceContext.resolve(
      tx,
      employee,
      clientTime,
    );
    if (dto.selfieKey) {
      if (runtime.policy.selfieMode === 'DISABLED') {
        throw new HttpException(
          {
            code: 'CAPABILITY_NOT_ENABLED',
            message: 'Selfie evidence is disabled by the attendance policy',
          },
          403,
        );
      }
      await this.storage.verifyPunchObject(
        this.requireTenantId(),
        employee.id,
        dto.selfieKey,
      );
    }
    const outcome = await this.evaluate(
      tx,
      dto,
      request,
      employee,
      runtime.policy,
      options,
    );
    const log = await tx.attendanceVerificationLog.create({
      data: {
        tenantId: this.requireTenantId(),
        employeeId: employee.id,
        deviceId: outcome.deviceId,
        verificationType:
          dto.type === 'CHECKIN'
            ? VerificationType.CHECKIN
            : VerificationType.CHECKOUT,
        attemptLatitude: dto.latitude,
        attemptLongitude: dto.longitude,
        attemptAccuracyM: dto.accuracyMeters,
        matchedOfficeId: outcome.matchedOfficeId,
        distanceFromGeofenceM: outcome.distanceMeters,
        locationMethod: outcome.locationMethod,
        faceMatchScore: outcome.faceScore,
        livenessOk: outcome.livenessOk,
        selfieKey: dto.selfieKey,
        gpsValid: outcome.checks.some(
          ({ check, passed }) => check === 'location' && passed,
        ),
        observedIp: request.ipAddress,
        userAgent: request.userAgent,
        appVersion: dto.appVersion,
        osVersion: dto.osVersion,
        mockLocation:
          outcome.integrity?.mockLocation ?? dto.mockLocation ?? false,
        isRooted: outcome.integrity?.rooted ?? false,
        deviceValid: outcome.checks.find(({ check }) => check === 'device')
          ?.passed,
        clockSkewSeconds:
          options.clockSkewSeconds ??
          Math.round((Date.now() - clientTime.getTime()) / 1000),
        integrityVerdict: outcome.integrity
          ? (outcome.integrity.raw as Prisma.InputJsonValue)
          : undefined,
        verificationStatus: outcome.passed
          ? VerificationStatus.PASSED
          : VerificationStatus.FAILED,
        failureReasons: outcome.code
          ? ([outcome.code] as Prisma.InputJsonValue)
          : [],
      },
    });

    if (!outcome.passed) {
      await this.alerts.evaluateRejection(tx, {
        tenantId: this.requireTenantId(),
        employeeId: employee.id,
        verificationLogId: log.id,
        code: outcome.code!,
      });
      await this.outbox.append(tx, {
        tenantId: this.requireTenantId(),
        eventKey: 'attendance.mobile_punch_rejected',
        payload: {
          employeeId: employee.id,
          verificationLogId: log.id,
          code: outcome.code!,
        },
      });
      return { error: outcome.code!, details: outcome.details };
    }

    const attendance = await this.runtime.punchInTransaction(
      tx,
      EventType[dto.type],
      {
        requestId: dto.requestId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        source: PunchSource.MOBILE,
        verificationLogId: log.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyM: dto.accuracyMeters,
        isOfflineSync: options.offline ?? false,
        timeSuspect: options.timeSuspect ?? false,
      },
      clientTime,
    );
    return {
      data: attendance,
      verification: {
        id: log.id,
        status: log.verificationStatus,
        checks: outcome.checks.map(({ check, passed, skipped }) => ({
          check,
          passed,
          skipped: skipped ?? false,
        })),
      },
    };
  }

  private async evaluate(
    tx: PrismaTransaction,
    dto: VerifiedPunchDto,
    request: { ipAddress?: string; jwtDeviceId?: string },
    employee: {
      id: string;
      workType: string;
      faceEmbeddingRef: string | null;
    },
    policy: {
      requireRegisteredDevice?: boolean;
      requireGeofence?: boolean;
      locationMode?: 'NONE' | 'OFFICE_GEOFENCE' | 'FIELD_GPS';
      requireFaceMatch?: boolean;
      selfieMode?: 'DISABLED' | 'REQUIRED';
      allowBiometricOptOut?: boolean;
      maxFaceAttempts?: number;
    },
    options: VerificationExecutionOptions = {},
  ): Promise<VerificationOutcome> {
    const checks: CheckResult[] = [];
    const completed: {
      deviceId?: string;
      integrity?: IntegrityVerdict;
      locationMethod: LocationMethod;
      matchedOfficeId?: string;
      distanceMeters?: number;
    } = { locationMethod: LocationMethod.NONE };
    let faceScore: number | undefined;
    let livenessOk: boolean | undefined;
    const fail = (
      check: string,
      code: FailureCode,
      evidence: Record<string, unknown> = {},
    ): VerificationOutcome => ({
      passed: false,
      checks: [...checks, { check, passed: false, code, evidence }],
      code,
      details: safeDetails(evidence),
      deviceId: completed.deviceId,
      integrity: completed.integrity,
      locationMethod: completed.locationMethod,
      matchedOfficeId: completed.matchedOfficeId,
      distanceMeters:
        typeof evidence.distanceMeters === 'number'
          ? evidence.distanceMeters
          : completed.distanceMeters,
      faceScore,
      livenessOk,
    });

    const device = await tx.registeredDevice.findUnique({
      where: {
        tenantId_deviceUuid: {
          tenantId: this.requireTenantId(),
          deviceUuid: dto.deviceUuid,
        },
      },
    });
    completed.deviceId = device?.id;
    if (policy.requireRegisteredDevice !== false) {
      if (!device) return fail('device', 'DEVICE_NOT_REGISTERED');
      if (device.status === 'PENDING_APPROVAL') {
        return fail('device', 'DEVICE_PENDING_APPROVAL');
      }
      if (device.status === 'BLOCKED') return fail('device', 'DEVICE_BLOCKED');
      if (device.status !== 'ACTIVE' || device.employeeId !== employee.id) {
        return fail('device', 'DEVICE_NOT_OWNED');
      }
      if (request.jwtDeviceId && request.jwtDeviceId !== device.id) {
        return fail('device', 'DEVICE_NOT_OWNED');
      }
    }
    checks.push({
      check: 'device',
      passed: true,
      skipped: policy.requireRegisteredDevice === false,
      evidence: { deviceId: device?.id },
    });

    const integrity = await this.integrity.verify(dto.attestationToken, {
      tx,
      tenantId: this.requireTenantId(),
      employeeId: employee.id,
      deviceId: device?.id ?? '',
      platform: device?.platform ?? 'ANDROID',
    });
    if (!integrity)
      return fail('integrity', 'VERIFICATION_PROVIDER_UNAVAILABLE');
    completed.integrity = integrity;
    if (!integrity.genuineDevice) return fail('integrity', 'INTEGRITY_FAILED');
    if (integrity.rooted) return fail('integrity', 'ROOTED_DEVICE');
    if (integrity.mockLocation || dto.mockLocation) {
      return fail('integrity', 'MOCK_LOCATION');
    }
    checks.push({ check: 'integrity', passed: true, evidence: {} });

    const skewSeconds = options.offline
      ? Math.abs(options.clockSkewSeconds ?? 0)
      : Math.abs(Date.now() - new Date(dto.clientTime).getTime()) / 1000;
    if (skewSeconds > 300) {
      return fail('clock', 'CLOCK_TAMPER', {
        clockSkewSeconds: Math.round(skewSeconds),
      });
    }
    checks.push({ check: 'clock', passed: true, evidence: {} });

    const locationMode =
      policy.locationMode ??
      (policy.requireGeofence === false ? 'NONE' : 'OFFICE_GEOFENCE');
    const location =
      locationMode === 'NONE'
        ? {
            check: 'location',
            passed: true,
            skipped: true,
            evidence: { locationMethod: LocationMethod.NONE, skipped: true },
          }
        : await this.locationCheck(
            tx,
            dto,
            request.ipAddress,
            employee,
            locationMode,
          );
    if (!location.passed)
      return fail('location', location.code!, location.evidence);
    checks.push(location);
    completed.locationMethod = location.evidence
      .locationMethod as LocationMethod;
    completed.matchedOfficeId = location.evidence.officeId as
      string | undefined;
    completed.distanceMeters = location.evidence.distanceMeters as
      number | undefined;
    const selfieMode =
      policy.selfieMode ??
      (policy.requireFaceMatch === true ? 'REQUIRED' : 'DISABLED');
    if (selfieMode === 'REQUIRED') {
      const maxFaceAttempts = policy.maxFaceAttempts ?? 3;
      const consent = await tx.biometricConsent.findFirst({
        where: { employeeId: employee.id },
        orderBy: { consentedAt: 'desc' },
      });
      const hasConsent = consent?.action === 'GRANTED';
      if (!hasConsent && policy.allowBiometricOptOut === true) {
        checks.push({
          check: 'face',
          passed: true,
          skipped: true,
          evidence: { skipped: true, reason: 'BIOMETRIC_OPT_OUT' },
        });
        return {
          passed: true,
          checks,
          details: {},
          deviceId: completed.deviceId,
          integrity: completed.integrity,
          locationMethod: completed.locationMethod,
          matchedOfficeId: completed.matchedOfficeId,
          distanceMeters: completed.distanceMeters,
        };
      }
      if (!hasConsent) return fail('face', 'CONSENT_MISSING');
      if (!employee.faceEmbeddingRef) return fail('face', 'FACE_NOT_ENROLLED');
      if (!dto.selfieKey) return fail('face', 'FACE_MISMATCH');
      const recent = await tx.attendanceVerificationLog.findMany({
        where: {
          employeeId: employee.id,
          verificationStatus: VerificationStatus.FAILED,
          verifiedAt: { gte: new Date(Date.now() - 15 * 60_000) },
        },
        select: { failureReasons: true },
      });
      const failedFaces = recent.filter(
        ({ failureReasons }) =>
          Array.isArray(failureReasons) &&
          failureReasons.includes('FACE_MISMATCH'),
      ).length;
      if (failedFaces >= maxFaceAttempts) {
        return fail('face', 'FACE_ATTEMPTS_EXCEEDED', { attemptsRemaining: 0 });
      }
      const face = await this.faces.compare(
        employee.faceEmbeddingRef,
        dto.selfieKey,
      );
      if (!face) return fail('face', 'VERIFICATION_PROVIDER_UNAVAILABLE');
      faceScore = face.score;
      livenessOk = face.livenessOk;
      if (!face.livenessOk) return fail('face', 'LIVENESS_FAILED');
      const settings = await tx.tenantSettings.findUniqueOrThrow({
        where: { tenantId: this.requireTenantId() },
      });
      if (face.score < settings.faceMatchThreshold) {
        return fail('face', 'FACE_MISMATCH', {
          attemptsRemaining: Math.max(0, maxFaceAttempts - failedFaces - 1),
        });
      }
      checks.push({ check: 'face', passed: true, evidence: {} });
    }

    return {
      passed: true,
      checks,
      details: {},
      deviceId: completed.deviceId,
      integrity: completed.integrity,
      locationMethod: completed.locationMethod,
      matchedOfficeId: completed.matchedOfficeId,
      distanceMeters: completed.distanceMeters,
      faceScore,
      livenessOk,
    };
  }

  private async locationCheck(
    tx: PrismaTransaction,
    dto: VerifiedPunchDto,
    observedIp: string | undefined,
    employee: { id: string; workType: string },
    locationMode: 'OFFICE_GEOFENCE' | 'FIELD_GPS',
  ): Promise<CheckResult> {
    if (
      dto.latitude === undefined ||
      dto.longitude === undefined ||
      dto.accuracyMeters === undefined
    ) {
      return {
        check: 'location',
        passed: false,
        code: 'LOCATION_REQUIRED',
        evidence: {},
      };
    }
    const latitude = dto.latitude;
    const longitude = dto.longitude;
    const accuracyMeters = dto.accuracyMeters;
    if (accuracyMeters > 100) {
      return {
        check: 'location',
        passed: false,
        code: 'GPS_ACCURACY_TOO_LOW',
        evidence: { accuracyMeters },
      };
    }
    if (locationMode === 'FIELD_GPS') {
      return {
        check: 'location',
        passed: true,
        evidence: { locationMethod: LocationMethod.GPS_ONLY },
      };
    }
    const assignments = await tx.employeeOfficeAssignment.findMany({
      where: { employeeId: employee.id },
      include: { office: true },
    });
    if (!assignments.length) {
      return {
        check: 'location',
        passed: false,
        code: 'NO_OFFICE_ASSIGNED',
        evidence: {},
      };
    }
    const ipOffice = assignments.find(({ office }) => {
      const egress = Array.isArray(office.egressIps) ? office.egressIps : [];
      return observedIp
        ? egress.some(
            (entry) =>
              typeof entry === 'string' &&
              networkIncludesAddress(entry, observedIp),
          )
        : false;
    });
    if (ipOffice) {
      return {
        check: 'location',
        passed: true,
        evidence: {
          locationMethod: LocationMethod.OFFICE_IP,
          officeId: ipOffice.officeLocationId,
        },
      };
    }
    const distances = assignments.map(({ officeLocationId, office }) => ({
      officeId: officeLocationId,
      radiusMeters: office.radiusMeters,
      distanceMeters: haversine(
        latitude,
        longitude,
        Number(office.latitude),
        Number(office.longitude),
      ),
    }));
    distances.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const nearest = distances[0];
    if (nearest.distanceMeters <= nearest.radiusMeters + accuracyMeters) {
      return {
        check: 'location',
        passed: true,
        evidence: {
          locationMethod: LocationMethod.GEOFENCE,
          officeId: nearest.officeId,
          distanceMeters: Math.round(nearest.distanceMeters),
        },
      };
    }
    return {
      check: 'location',
      passed: false,
      code: 'OUTSIDE_GEOFENCE',
      evidence: {
        distanceMeters: Math.round(nearest.distanceMeters),
        nearestOfficeId: nearest.officeId,
        accuracyMeters,
      },
    };
  }

  private requireTenantId() {
    if (!this.context.tenantId) throw new Error('Tenant context is required');
    return this.context.tenantId;
  }

  private requireUserId() {
    if (!this.context.userId) throw new Error('User context is required');
    return this.context.userId;
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLng = radians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function safeDetails(evidence: Record<string, unknown>) {
  const allowed = new Set([
    'distanceMeters',
    'nearestOfficeId',
    'accuracyMeters',
    'attemptsRemaining',
    'clockSkewSeconds',
  ]);
  return Object.fromEntries(
    Object.entries(evidence).filter(([key]) => allowed.has(key)),
  );
}

function failureStatus(code: FailureCode) {
  if (code === 'DEVICE_BLOCKED' || code === 'DEVICE_NOT_OWNED') return 403;
  if (code === 'DEVICE_PENDING_APPROVAL') return 423;
  if (code === 'FACE_ATTEMPTS_EXCEEDED') return 429;
  if (code === 'VERIFICATION_PROVIDER_UNAVAILABLE') return 503;
  return 422;
}

function failureMessage(code: FailureCode) {
  const messages: Record<FailureCode, string> = {
    DEVICE_NOT_REGISTERED: 'Register this device before recording attendance',
    DEVICE_PENDING_APPROVAL: 'This device is waiting for HR approval',
    DEVICE_BLOCKED: 'This device has been blocked by HR',
    DEVICE_NOT_OWNED: 'This device does not belong to your employee profile',
    INTEGRITY_FAILED: 'Device integrity verification failed',
    ROOTED_DEVICE: 'Attendance is unavailable on rooted devices',
    MOCK_LOCATION: 'Disable mock location and try again',
    CLOCK_TAMPER: 'Correct the device date and time and try again',
    GPS_ACCURACY_TOO_LOW: 'Improve GPS accuracy and try again',
    LOCATION_REQUIRED: 'Location is required by your attendance policy',
    NO_OFFICE_ASSIGNED: 'No attendance office is assigned to your profile',
    OUTSIDE_GEOFENCE: 'You are outside the approved attendance location',
    CONSENT_MISSING: 'Biometric consent is required by your attendance policy',
    FACE_NOT_ENROLLED: 'Complete face enrollment before recording attendance',
    LIVENESS_FAILED: 'Liveness verification failed',
    FACE_MISMATCH: 'Your face did not match the enrolled profile',
    FACE_ATTEMPTS_EXCEEDED: 'Too many face attempts. Try again later',
    VERIFICATION_PROVIDER_UNAVAILABLE:
      'Verification is temporarily unavailable',
  };
  return messages[code];
}

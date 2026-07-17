import { HttpException } from '@nestjs/common';
import { DeviceStatus, VerificationStatus, WorkType } from '@prisma/client';
import type {
  PrismaService,
  PrismaTransaction,
} from '../../shared/database/prisma.service';
import type { OutboxService } from '../../shared/events/outbox.service';
import type { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import type { AttendanceContextService } from '../attendance/application/attendance-context.service';
import type { AttendanceRuntimeService } from '../attendance/application/attendance-runtime.service';
import type { PrivateEvidenceStorageService } from '../biometrics/private-evidence-storage.service';
import type { SecurityAlertEvaluatorService } from '../security-alerts/security-alert-evaluator.service';
import type { VerifiedPunchDto } from './dto/verified-punch.dto';
import { AttendanceVerificationService } from './attendance-verification.service';
import type {
  DeviceIntegrityProvider,
  FaceMatchProvider,
  FaceVerdict,
  IntegrityVerdict,
} from './verification-providers';

const tenantId = '10000000-0000-4000-8000-000000000001';
const userId = '20000000-0000-4000-8000-000000000001';
const employeeId = '30000000-0000-4000-8000-000000000001';
const deviceId = '40000000-0000-4000-8000-000000000001';
const deviceUuid = '50000000-0000-4000-8000-000000000001';

type MatrixCase = {
  name: string;
  expectedCode?: string;
  workType?: WorkType;
  device?: null | { status: DeviceStatus; employeeId?: string };
  integrity?: IntegrityVerdict | null;
  clientTime?: string;
  accuracyMeters?: number;
  requireRegisteredDevice?: boolean;
  requireGeofence?: boolean;
  requireFaceMatch?: boolean;
  allowBiometricOptOut?: boolean;
  consentAction?: 'GRANTED' | 'WITHDRAWN' | null;
  faceEmbeddingRef?: string | null;
  selfieKey?: string;
  face?: FaceVerdict | null;
  expectedChecks?: string[];
  expectedSkippedChecks?: string[];
};

const validIntegrity: IntegrityVerdict = {
  genuineDevice: true,
  mockLocation: false,
  rooted: false,
  raw: { provider: 'unit' },
};

describe('AttendanceVerificationService check matrix', () => {
  const cases: MatrixCase[] = [
    {
      name: 'passes device, integrity, clock and field GPS checks',
      workType: WorkType.FIELD,
      expectedChecks: ['device', 'integrity', 'clock', 'location'],
    },
    {
      name: 'skips required device binding when policy disables it',
      device: null,
      requireRegisteredDevice: false,
      workType: WorkType.FIELD,
      expectedChecks: ['device', 'integrity', 'clock', 'location'],
      expectedSkippedChecks: ['device'],
    },
    {
      name: 'fails an unregistered required device',
      device: null,
      expectedCode: 'DEVICE_NOT_REGISTERED',
    },
    {
      name: 'fails when the integrity provider is unavailable',
      integrity: null,
      expectedCode: 'VERIFICATION_PROVIDER_UNAVAILABLE',
    },
    {
      name: 'fails a rooted integrity verdict',
      integrity: { ...validIntegrity, rooted: true },
      expectedCode: 'ROOTED_DEVICE',
    },
    {
      name: 'fails clock skew outside the five-minute window',
      clientTime: '2026-07-17T08:00:00.000Z',
      expectedCode: 'CLOCK_TAMPER',
    },
    {
      name: 'skips location when geofence policy is disabled',
      requireGeofence: false,
      expectedChecks: ['device', 'integrity', 'clock', 'location'],
      expectedSkippedChecks: ['location'],
    },
    {
      name: 'fails mandatory field GPS accuracy',
      workType: WorkType.FIELD,
      accuracyMeters: 101,
      expectedCode: 'GPS_ACCURACY_TOO_LOW',
    },
    {
      name: 'skips face after a policy-approved biometric withdrawal',
      workType: WorkType.FIELD,
      requireFaceMatch: true,
      allowBiometricOptOut: true,
      consentAction: 'WITHDRAWN',
      expectedChecks: ['device', 'integrity', 'clock', 'location', 'face'],
      expectedSkippedChecks: ['face'],
    },
    {
      name: 'fails face when active consent is required but absent',
      workType: WorkType.FIELD,
      requireFaceMatch: true,
      consentAction: null,
      expectedCode: 'CONSENT_MISSING',
    },
    {
      name: 'fails closed when the face provider is unavailable',
      workType: WorkType.FIELD,
      requireFaceMatch: true,
      consentAction: 'GRANTED',
      faceEmbeddingRef: 'face:employee',
      selfieKey: 'private/punch.jpg',
      face: null,
      expectedCode: 'VERIFICATION_PROVIDER_UNAVAILABLE',
    },
    {
      name: 'fails liveness before accepting a face match score',
      workType: WorkType.FIELD,
      requireFaceMatch: true,
      consentAction: 'GRANTED',
      faceEmbeddingRef: 'face:employee',
      selfieKey: 'private/liveness-fail.jpg',
      face: { score: 99, livenessOk: false },
      expectedCode: 'LIVENESS_FAILED',
    },
    {
      name: 'passes the complete required face pipeline',
      workType: WorkType.FIELD,
      requireFaceMatch: true,
      consentAction: 'GRANTED',
      faceEmbeddingRef: 'face:employee',
      selfieKey: 'private/punch.jpg',
      face: { score: 99, livenessOk: true },
      expectedChecks: ['device', 'integrity', 'clock', 'location', 'face'],
    },
  ];

  beforeEach(() =>
    jest.useFakeTimers().setSystemTime(new Date('2026-07-17T10:00:00Z')),
  );
  afterEach(() => jest.useRealTimers());

  it.each(cases)('$name', async (matrix) => {
    const fixture = createFixture(matrix);

    if (matrix.expectedCode) {
      await fixture.execute().then(
        () => {
          throw new Error('Expected verification to fail');
        },
        (error: unknown) => {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getResponse()).toMatchObject({
            code: matrix.expectedCode,
          });
        },
      );
      expect(fixture.runtimePunch).not.toHaveBeenCalled();
      expect(fixture.alert).toHaveBeenCalledTimes(1);
      expect(fixture.loggedStatus()).toBe(VerificationStatus.FAILED);
      return;
    }

    const result = await fixture.execute();
    expect(result.verification.checks.map(({ check }) => check)).toEqual(
      matrix.expectedChecks,
    );
    expect(
      result.verification.checks
        .filter(({ skipped }) => skipped)
        .map(({ check }) => check),
    ).toEqual(matrix.expectedSkippedChecks ?? []);
    expect(fixture.runtimePunch).toHaveBeenCalledTimes(1);
    expect(fixture.alert).not.toHaveBeenCalled();
    expect(fixture.loggedStatus()).toBe(VerificationStatus.PASSED);
  });
});

function createFixture(matrix: MatrixCase) {
  const createdLogs: Array<{ verificationStatus: VerificationStatus }> = [];
  const activeDevice =
    matrix.device === null
      ? null
      : {
          id: deviceId,
          tenantId,
          employeeId: matrix.device?.employeeId ?? employeeId,
          deviceUuid,
          status: matrix.device?.status ?? DeviceStatus.ACTIVE,
        };
  const tx = {
    registeredDevice: {
      findUnique: jest.fn().mockResolvedValue(activeDevice),
    },
    employeeOfficeAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    biometricConsent: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          matrix.consentAction
            ? { action: matrix.consentAction, consentedAt: new Date() }
            : null,
        ),
    },
    attendanceVerificationLog: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation(
          (args: { data: { verificationStatus: VerificationStatus } }) => {
            createdLogs.push({
              verificationStatus: args.data.verificationStatus,
            });
            return Promise.resolve({
              id: '60000000-0000-4000-8000-000000000001',
              verificationStatus: args.data.verificationStatus,
            });
          },
        ),
    },
    tenantSettings: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ faceMatchThreshold: 80 }),
    },
  } as unknown as PrismaTransaction;
  const prisma = {
    forTenant: (callback: (transaction: PrismaTransaction) => unknown) =>
      callback(tx),
  } as unknown as PrismaService;
  const context = { tenantId, userId } as TenantContextService;
  const attendanceContext = {
    employeeForUser: jest.fn().mockResolvedValue({
      id: employeeId,
      workType: matrix.workType ?? WorkType.OFFICE,
      faceEmbeddingRef: matrix.faceEmbeddingRef ?? null,
    }),
    resolve: jest.fn().mockResolvedValue({
      policy: {
        requireRegisteredDevice: matrix.requireRegisteredDevice ?? true,
        requireGeofence: matrix.requireGeofence ?? true,
        requireFaceMatch: matrix.requireFaceMatch ?? false,
        allowBiometricOptOut: matrix.allowBiometricOptOut ?? false,
        maxFaceAttempts: 3,
      },
    }),
  } as unknown as AttendanceContextService;
  const runtimePunch = jest.fn().mockResolvedValue({ id: 'attendance-log' });
  const runtime = {
    punchInTransaction: runtimePunch,
  } as unknown as AttendanceRuntimeService;
  const outbox = {
    append: jest.fn().mockResolvedValue({}),
  } as unknown as OutboxService;
  const integrity = {
    verify: jest
      .fn()
      .mockResolvedValue(
        matrix.integrity === undefined ? validIntegrity : matrix.integrity,
      ),
  } as unknown as DeviceIntegrityProvider;
  const faces = {
    compare: jest
      .fn()
      .mockResolvedValue(
        matrix.face === undefined
          ? { score: 99, livenessOk: true }
          : matrix.face,
      ),
  } as unknown as FaceMatchProvider;
  const storage = {
    verifyPunchObject: jest.fn().mockResolvedValue(undefined),
  } as unknown as PrivateEvidenceStorageService;
  const alert = jest.fn().mockResolvedValue(undefined);
  const alerts = {
    evaluateRejection: alert,
  } as unknown as SecurityAlertEvaluatorService;
  const service = new AttendanceVerificationService(
    prisma,
    context,
    attendanceContext,
    runtime,
    outbox,
    integrity,
    faces,
    storage,
    alerts,
  );
  const dto: VerifiedPunchDto = {
    type: 'CHECKIN',
    deviceUuid,
    attestationToken: 'unit-token',
    clientTime: matrix.clientTime ?? '2026-07-17T10:00:00.000Z',
    requestId: '70000000-0000-4000-8000-000000000001',
    latitude: 23.588,
    longitude: 58.3829,
    accuracyMeters: matrix.accuracyMeters ?? 8,
    selfieKey: matrix.selfieKey,
    appVersion: '1.0.0',
    osVersion: '16',
  };
  return {
    execute: () =>
      service.punch(dto, {
        ipAddress: '127.0.0.1',
        userAgent: 'unit-test',
        jwtDeviceId: activeDevice?.id,
      }),
    runtimePunch,
    alert,
    loggedStatus: () => createdLogs.at(-1)?.verificationStatus,
  };
}

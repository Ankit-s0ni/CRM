import { Injectable } from '@nestjs/common';
import {
  AlertRuleType,
  AlertSeverity,
  Prisma,
  SecurityAlertType,
} from '@prisma/client';
import { PrismaTransaction } from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';

type RejectionCode =
  | 'OUTSIDE_GEOFENCE'
  | 'FACE_MISMATCH'
  | 'LIVENESS_FAILED'
  | 'MOCK_LOCATION'
  | 'ROOTED_DEVICE'
  | 'CLOCK_TAMPER'
  | 'DEVICE_NOT_REGISTERED'
  | 'DEVICE_NOT_OWNED'
  | 'DEVICE_BLOCKED';

const REJECTION_RULES: Partial<
  Record<
    RejectionCode,
    {
      ruleType: AlertRuleType;
      alertType: SecurityAlertType;
      severity: AlertSeverity;
      title: string;
    }
  >
> = {
  OUTSIDE_GEOFENCE: {
    ruleType: AlertRuleType.GEOFENCE_VIOLATION,
    alertType: SecurityAlertType.GEOFENCE_VIOLATION,
    severity: AlertSeverity.WARNING,
    title: 'Attendance attempt outside geofence',
  },
  FACE_MISMATCH: {
    ruleType: AlertRuleType.FACE_MISMATCH,
    alertType: SecurityAlertType.FACE_MISMATCH,
    severity: AlertSeverity.WARNING,
    title: 'Face verification mismatch',
  },
  LIVENESS_FAILED: {
    ruleType: AlertRuleType.FACE_MISMATCH,
    alertType: SecurityAlertType.FACE_MISMATCH,
    severity: AlertSeverity.CRITICAL,
    title: 'Liveness verification failed',
  },
  MOCK_LOCATION: {
    ruleType: AlertRuleType.MOCK_LOCATION,
    alertType: SecurityAlertType.MOCK_LOCATION,
    severity: AlertSeverity.CRITICAL,
    title: 'Mock location detected',
  },
  ROOTED_DEVICE: {
    ruleType: AlertRuleType.ROOTED_DEVICE,
    alertType: SecurityAlertType.ROOTED_DEVICE,
    severity: AlertSeverity.CRITICAL,
    title: 'Rooted device detected',
  },
  CLOCK_TAMPER: {
    ruleType: AlertRuleType.CLOCK_TAMPER,
    alertType: SecurityAlertType.CLOCK_TAMPER,
    severity: AlertSeverity.WARNING,
    title: 'Device clock tampering detected',
  },
  DEVICE_NOT_REGISTERED: {
    ruleType: AlertRuleType.DEVICE_MISMATCH,
    alertType: SecurityAlertType.UNREGISTERED_DEVICE,
    severity: AlertSeverity.WARNING,
    title: 'Unregistered attendance device',
  },
  DEVICE_NOT_OWNED: {
    ruleType: AlertRuleType.DEVICE_MISMATCH,
    alertType: SecurityAlertType.DEVICE_MISMATCH,
    severity: AlertSeverity.CRITICAL,
    title: 'Attendance device belongs to another employee',
  },
  DEVICE_BLOCKED: {
    ruleType: AlertRuleType.DEVICE_MISMATCH,
    alertType: SecurityAlertType.DEVICE_MISMATCH,
    severity: AlertSeverity.CRITICAL,
    title: 'Blocked device attempted attendance',
  },
};

@Injectable()
export class SecurityAlertEvaluatorService {
  constructor(private readonly outbox: OutboxService) {}

  async evaluateRejection(
    tx: PrismaTransaction,
    input: {
      tenantId: string;
      employeeId: string;
      verificationLogId: string;
      code: string;
    },
  ) {
    const definition = REJECTION_RULES[input.code as RejectionCode];
    if (!definition) return null;
    const [rule, employee, verification] = await Promise.all([
      tx.alertRule.findUnique({
        where: {
          tenantId_ruleType: {
            tenantId: input.tenantId,
            ruleType: definition.ruleType,
          },
        },
      }),
      tx.employee.findUnique({
        where: { id: input.employeeId },
        select: { deptId: true },
      }),
      tx.attendanceVerificationLog.findUnique({
        where: { id: input.verificationLogId },
      }),
    ]);
    if (!rule?.isActive || !verification) return null;
    const scopedDepartments = stringArray(rule.scopeDeptIds);
    if (
      scopedDepartments.length &&
      !scopedDepartments.includes(employee?.deptId ?? '')
    ) {
      return null;
    }
    const cooldownStart = new Date(Date.now() - rule.cooldownMinutes * 60_000);
    const duplicate = await tx.securityAlert.findFirst({
      where: {
        employeeId: input.employeeId,
        ruleId: rule.id,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        createdAt: { gte: cooldownStart },
      },
      select: { id: true },
    });
    if (duplicate) return duplicate;

    const alert = await tx.securityAlert.create({
      data: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        verificationLogId: input.verificationLogId,
        ruleId: rule.id,
        alertType: definition.alertType,
        severity: definition.severity,
        title: definition.title,
        details: alertEvidence(input.code, verification),
      },
    });
    await this.outbox.append(tx, {
      tenantId: input.tenantId,
      eventKey: 'attendance.security_alert.created',
      payload: {
        alertId: alert.id,
        employeeId: input.employeeId,
        type: alert.alertType,
        severity: alert.severity,
      },
    });
    return alert;
  }
}

function alertEvidence(
  code: string,
  verification: {
    attemptLatitude: Prisma.Decimal | null;
    attemptLongitude: Prisma.Decimal | null;
    attemptAccuracyM: number | null;
    distanceFromGeofenceM: number | null;
    selfieKey: string | null;
    faceMatchScore: number | null;
    deviceId: string | null;
  },
): Prisma.InputJsonObject {
  return {
    code,
    ...(verification.attemptLatitude && verification.attemptLongitude
      ? {
          mapPoint: {
            latitude: Number(verification.attemptLatitude),
            longitude: Number(verification.attemptLongitude),
            accuracyMeters: verification.attemptAccuracyM,
          },
        }
      : {}),
    ...(verification.distanceFromGeofenceM !== null
      ? { distanceMeters: verification.distanceFromGeofenceM }
      : {}),
    ...(verification.faceMatchScore !== null
      ? { scoreCategory: scoreCategory(verification.faceMatchScore) }
      : {}),
    ...(verification.selfieKey ? { hasSelfieEvidence: true } : {}),
    ...(verification.deviceId ? { deviceId: verification.deviceId } : {}),
  };
}

function scoreCategory(score: number) {
  if (score >= 85) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  return 'LOW';
}

function stringArray(value: Prisma.JsonValue) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

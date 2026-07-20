import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlertStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../../platform/audit/public';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { TenantContextService } from '../../../platform/tenancy/public';
import { PrivateEvidenceStorageService } from '../biometrics/private-evidence-storage.service';
import {
  AlertDecisionDto,
  CreateAlertRuleDto,
  ListSecurityAlertsDto,
  ListVerificationLogsDto,
  UpdateAlertRuleDto,
} from './dto/security-alert.dto';

@Injectable()
export class SecurityAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly storage: PrivateEvidenceStorageService,
  ) {}

  verificationLogs(query: ListVerificationLogsDto) {
    return this.prisma.forTenant(async (tx) => {
      const where: Prisma.AttendanceVerificationLogWhereInput = {
        employeeId: query.employeeId,
        verificationStatus: query.status,
        verifiedAt:
          query.from || query.to
            ? {
                gte: query.from ? new Date(query.from) : undefined,
                lte: query.to ? new Date(query.to) : undefined,
              }
            : undefined,
      };
      const [rows, total] = await Promise.all([
        tx.attendanceVerificationLog.findMany({
          where,
          orderBy: { verifiedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.attendanceVerificationLog.count({ where }),
      ]);
      return {
        data: rows.map((row) => ({
          id: row.id,
          employeeId: row.employeeId,
          deviceId: row.deviceId,
          verificationType: row.verificationType,
          status: row.verificationStatus,
          locationMethod: row.locationMethod,
          matchedOfficeId: row.matchedOfficeId,
          distanceMeters: row.distanceFromGeofenceM,
          accuracyMeters: row.attemptAccuracyM,
          failureReasons: row.failureReasons,
          mockLocation: row.mockLocation,
          isRooted: row.isRooted,
          deviceValid: row.deviceValid,
          clockSkewSeconds: row.clockSkewSeconds,
          hasSelfieEvidence: Boolean(row.selfieKey),
          verifiedAt: row.verifiedAt,
        })),
        meta: pageMeta(query.page, query.limit, total),
      };
    });
  }

  rules() {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.alertRule.findMany({ orderBy: { ruleType: 'asc' } }),
    }));
  }

  createRule(dto: CreateAlertRuleDto) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.validateRuleReferences(tx, dto);
      const rule = await tx.alertRule.create({
        data: { tenantId, ...ruleData(dto), ruleType: dto.ruleType },
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'attendance.alert_rule.created',
        module: 'attendance',
        entityType: 'AlertRule',
        entityId: rule.id,
        newValue: rule,
      });
      return { data: rule };
    });
  }

  updateRule(id: string, dto: UpdateAlertRuleDto) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.alertRule.findUnique({ where: { id } });
      if (!current) this.notFound('Alert rule');
      await this.validateRuleReferences(tx, dto);
      const rule = await tx.alertRule.update({
        where: { id },
        data: ruleData(dto),
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'attendance.alert_rule.updated',
        module: 'attendance',
        entityType: 'AlertRule',
        entityId: id,
        oldValue: current,
        newValue: rule,
      });
      return { data: rule };
    });
  }

  deleteRule(id: string) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.alertRule.findUnique({ where: { id } });
      if (!current) this.notFound('Alert rule');
      const openAlerts = await tx.securityAlert.count({
        where: { ruleId: id, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      });
      if (openAlerts) {
        throw new ConflictException({
          code: 'ALERT_RULE_IN_USE',
          message: 'Resolve or dismiss open alerts before deleting this rule',
        });
      }
      await tx.alertRule.delete({ where: { id } });
      await this.audit.append(tx, {
        tenantId,
        action: 'attendance.alert_rule.deleted',
        module: 'attendance',
        entityType: 'AlertRule',
        entityId: id,
        oldValue: current,
      });
      return { success: true };
    });
  }

  alerts(query: ListSecurityAlertsDto) {
    return this.prisma.forTenant(async (tx) => {
      const where: Prisma.SecurityAlertWhereInput = {
        status: query.status,
        severity: query.severity,
        alertType: query.alertType,
        employeeId: query.employeeId,
        ...(query.departmentId || query.search
          ? {
              employeeId: {
                in: (
                  await tx.employee.findMany({
                    where: {
                      deptId: query.departmentId,
                      ...(query.search
                        ? {
                            OR: [
                              {
                                fullName: {
                                  contains: query.search,
                                  mode: 'insensitive',
                                },
                              },
                              {
                                employeeCode: {
                                  contains: query.search,
                                  mode: 'insensitive',
                                },
                              },
                            ],
                          }
                        : {}),
                    },
                    select: { id: true },
                  })
                ).map(({ id }) => id),
              },
            }
          : {}),
      };
      const [rows, total] = await Promise.all([
        tx.securityAlert.findMany({
          where,
          include: { rule: { select: { ruleType: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.securityAlert.count({ where }),
      ]);
      const employeeIds = [
        ...new Set(rows.map(({ employeeId }) => employeeId)),
      ];
      const employees = await tx.employee.findMany({
        where: { id: { in: employeeIds } },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          department: { select: { id: true, name: true } },
        },
      });
      const employeesById = new Map(employees.map((item) => [item.id, item]));
      return {
        data: rows.map((row) =>
          this.publicAlert(row, employeesById.get(row.employeeId)),
        ),
        meta: pageMeta(query.page, query.limit, total),
      };
    });
  }

  alert(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const row = await tx.securityAlert.findUnique({
        where: { id },
        include: { rule: true },
      });
      if (!row) this.notFound('Security alert');
      const employee = await tx.employee.findUnique({
        where: { id: row.employeeId },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          department: { select: { id: true, name: true } },
        },
      });
      return { data: this.publicAlert(row, employee) };
    });
  }

  evidence(id: string) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const alert = await tx.securityAlert.findUnique({ where: { id } });
      if (!alert?.verificationLogId) this.notFound('Alert evidence');
      const verification = await tx.attendanceVerificationLog.findUnique({
        where: { id: alert.verificationLogId },
      });
      if (!verification) this.notFound('Alert evidence');
      const signed = verification.selfieKey
        ? await this.storage.signedRead(
            tenantId,
            alert.employeeId,
            verification.selfieKey,
          )
        : null;
      await this.audit.append(tx, {
        tenantId,
        action: 'attendance.security_alert.evidence_viewed',
        module: 'attendance',
        entityType: 'SecurityAlert',
        entityId: id,
      });
      return {
        data: {
          mapPoint:
            verification.attemptLatitude && verification.attemptLongitude
              ? {
                  latitude: Number(verification.attemptLatitude),
                  longitude: Number(verification.attemptLongitude),
                  accuracyMeters: verification.attemptAccuracyM,
                }
              : null,
          distanceMeters: verification.distanceFromGeofenceM,
          scoreCategory:
            verification.faceMatchScore === null
              ? null
              : scoreCategory(verification.faceMatchScore),
          selfie: signed,
        },
      };
    });
  }

  decide(
    id: string,
    target: 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED',
    dto: AlertDecisionDto,
  ) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.securityAlert.findUnique({ where: { id } });
      if (!current) this.notFound('Security alert');
      assertTransition(current.status, target);
      const now = new Date();
      const userId = this.requireUserId();
      const alert = await tx.securityAlert.update({
        where: { id },
        data:
          target === 'ACKNOWLEDGED'
            ? {
                status: AlertStatus.ACKNOWLEDGED,
                acknowledgedBy: userId,
                acknowledgedAt: now,
              }
            : {
                status:
                  target === 'RESOLVED'
                    ? AlertStatus.RESOLVED
                    : AlertStatus.DISMISSED,
                resolvedBy: userId,
                resolvedAt: now,
                resolutionNote: dto.note,
              },
      });
      await Promise.all([
        this.audit.append(tx, {
          tenantId,
          action: `attendance.security_alert.${target.toLowerCase()}`,
          module: 'attendance',
          entityType: 'SecurityAlert',
          entityId: id,
          oldValue: current,
          newValue: { ...alert, decisionNote: dto.note },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: `attendance.security_alert.${target.toLowerCase()}`,
          payload: { alertId: id, employeeId: alert.employeeId },
        }),
      ]);
      return { data: this.publicAlert(alert) };
    });
  }

  private async validateRuleReferences(
    tx: Parameters<Parameters<PrismaService['forTenant']>[0]>[0],
    dto: Partial<CreateAlertRuleDto>,
  ) {
    if (dto.scopeDeptIds?.length) {
      const count = await tx.department.count({
        where: { id: { in: dto.scopeDeptIds } },
      });
      if (count !== new Set(dto.scopeDeptIds).size) this.notFound('Department');
    }
    if (dto.notifyUserIds?.length) {
      const count = await tx.user.count({
        where: { id: { in: dto.notifyUserIds } },
      });
      if (count !== new Set(dto.notifyUserIds).size) this.notFound('User');
    }
  }

  private publicAlert(alert: Record<string, unknown>, employee?: unknown) {
    return { ...alert, employee: employee ?? null };
  }

  private requireTenantId() {
    if (!this.context.tenantId) throw new Error('Tenant context is required');
    return this.context.tenantId;
  }

  private requireUserId() {
    if (!this.context.userId) throw new Error('User context is required');
    return this.context.userId;
  }

  private notFound(resource: string): never {
    throw new NotFoundException({
      code: 'SECURITY_RESOURCE_NOT_FOUND',
      message: `${resource} was not found`,
    });
  }
}

function ruleData(dto: Partial<CreateAlertRuleDto>) {
  return {
    ruleType: dto.ruleType,
    isActive: dto.isActive,
    thresholdConfig: dto.thresholdConfig as Prisma.InputJsonValue | undefined,
    channels: dto.channels as Prisma.InputJsonValue | undefined,
    notifyRoles: dto.notifyRoles as Prisma.InputJsonValue | undefined,
    notifyUserIds: dto.notifyUserIds as Prisma.InputJsonValue | undefined,
    scopeDeptIds: dto.scopeDeptIds as Prisma.InputJsonValue | undefined,
    cooldownMinutes: dto.cooldownMinutes,
  };
}

function assertTransition(current: AlertStatus, target: AlertStatus) {
  const valid =
    (target === AlertStatus.ACKNOWLEDGED && current === AlertStatus.OPEN) ||
    ((target === AlertStatus.RESOLVED || target === AlertStatus.DISMISSED) &&
      (current === AlertStatus.OPEN || current === AlertStatus.ACKNOWLEDGED));
  if (!valid) {
    throw new ConflictException({
      code: 'SECURITY_ALERT_STATE_INVALID',
      message: `A ${current.toLowerCase()} alert cannot become ${target.toLowerCase()}`,
    });
  }
}

function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}

function scoreCategory(score: number) {
  if (score >= 85) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  return 'LOW';
}

import {
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  JobStatus,
  LockStatus,
  PayrollLockAction,
  ReportType,
} from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import {
  PrismaService,
  PrismaTransaction,
} from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  CreatePayrollLockDto,
  ReopenPayrollLockDto,
} from './dto/payroll-lock.dto';

@Injectable()
export class PayrollLockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  list() {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.payrollLockPeriod.findMany({
        include: {
          export: {
            select: {
              id: true,
              checksum: true,
              completedAt: true,
              contractVersion: true,
            },
          },
          history: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { period: 'desc' },
      }),
    }));
  }

  lock(dto: CreatePayrollLockDto) {
    const tenantId = this.tenantId();
    const actor = this.userId();
    const range = periodRange(dto.period);
    return this.prisma.forTenant(async (tx) => {
      await this.periodLock(tx, tenantId, dto.period);
      const exportRow = await tx.reportExport.findFirst({
        where: {
          id: dto.exportId,
          reportType: ReportType.PAYROLL,
          period: dto.period,
          status: JobStatus.COMPLETED,
          contractVersion: 1,
        },
      });
      if (
        !exportRow?.objectKey ||
        !exportRow.checksum ||
        !exportRow.completedAt
      ) {
        throw new UnprocessableEntityException({
          code: 'PAYROLL_EXPORT_REQUIRED',
          message:
            'A completed payroll v1 export for this exact period is required',
        });
      }
      const logs = await tx.attendanceLog.findMany({
        where: { attendanceDate: { gte: range.start, lte: range.end } },
        select: {
          id: true,
          finalizedAt: true,
          attendanceStatus: true,
          updatedAt: true,
        },
      });
      if (
        !logs.length ||
        logs.some(
          (log) => !log.finalizedAt || log.attendanceStatus === 'PRESENT_OPEN',
        )
      ) {
        throw new UnprocessableEntityException({
          code: 'PAYROLL_PERIOD_NOT_FINALIZED',
          message:
            'Every attendance record in the payroll period must be finalized',
        });
      }
      const changedAfterSnapshot = logs.some(
        (log) => log.updatedAt > exportRow.sourceCutoff,
      );
      if (changedAfterSnapshot) {
        throw new UnprocessableEntityException({
          code: 'PAYROLL_EXPORT_STALE',
          message:
            'Attendance changed after this export was requested; generate a new payroll export',
        });
      }
      const existing = await tx.payrollLockPeriod.findUnique({
        where: { tenantId_period: { tenantId, period: dto.period } },
      });
      if (existing?.status === LockStatus.LOCKED) {
        if (existing.exportId === dto.exportId)
          return this.withRelations(tx, existing.id);
        throw new ConflictException({
          code: 'PAYROLL_PERIOD_ALREADY_LOCKED',
          message: 'This payroll period is already locked',
        });
      }
      const now = new Date();
      const lock = existing
        ? await tx.payrollLockPeriod.update({
            where: { id: existing.id },
            data: {
              status: LockStatus.LOCKED,
              exportId: dto.exportId,
              lockedBy: actor,
              lockedAt: now,
              reopenedBy: null,
              reopenedAt: null,
              reopenReason: null,
            },
          })
        : await tx.payrollLockPeriod.create({
            data: {
              tenantId,
              period: dto.period,
              status: LockStatus.LOCKED,
              exportId: dto.exportId,
              lockedBy: actor,
              lockedAt: now,
            },
          });
      await Promise.all([
        tx.attendanceLog.updateMany({
          where: { attendanceDate: { gte: range.start, lte: range.end } },
          data: { lockedAt: now, lockedBy: actor, payrollLockId: lock.id },
        }),
        tx.payrollLockHistory.create({
          data: {
            tenantId,
            payrollLockId: lock.id,
            action: PayrollLockAction.LOCKED,
            actorUserId: actor,
            exportId: dto.exportId,
          },
        }),
        this.record(tx, 'locked', lock.id, {
          period: dto.period,
          exportId: dto.exportId,
          checksum: exportRow.checksum,
        }),
      ]);
      return { data: await this.withRelations(tx, lock.id) };
    });
  }

  reopen(id: string, dto: ReopenPayrollLockDto) {
    const tenantId = this.tenantId();
    const actor = this.userId();
    return this.prisma.forTenant(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payroll_lock_periods WHERE id = ${id}::uuid FOR UPDATE`;
      const lock = await tx.payrollLockPeriod.findUnique({ where: { id } });
      if (!lock) this.notFound();
      if (lock.status !== LockStatus.LOCKED) {
        if (
          lock.status === LockStatus.REOPENED &&
          lock.reopenReason === dto.reason
        ) {
          return { data: await this.withRelations(tx, id) };
        }
        throw new ConflictException({
          code: 'PAYROLL_PERIOD_NOT_LOCKED',
          message: 'Only a locked payroll period can be reopened',
        });
      }
      const now = new Date();
      await Promise.all([
        tx.attendanceLog.updateMany({
          where: { payrollLockId: id },
          data: { lockedAt: null, lockedBy: null, payrollLockId: null },
        }),
        tx.payrollLockHistory.create({
          data: {
            tenantId,
            payrollLockId: id,
            action: PayrollLockAction.REOPENED,
            actorUserId: actor,
            reason: dto.reason,
            exportId: lock.exportId,
          },
        }),
        tx.payrollLockPeriod.update({
          where: { id },
          data: {
            status: LockStatus.REOPENED,
            reopenedBy: actor,
            reopenedAt: now,
            reopenReason: dto.reason,
          },
        }),
        this.record(tx, 'reopened', id, {
          period: lock.period,
          reason: dto.reason,
          exportId: lock.exportId,
        }),
      ]);
      return { data: await this.withRelations(tx, id) };
    });
  }

  private withRelations(tx: PrismaTransaction, id: string) {
    return tx.payrollLockPeriod.findUniqueOrThrow({
      where: { id },
      include: { export: true, history: { orderBy: { createdAt: 'desc' } } },
    });
  }

  private async record(
    tx: PrismaTransaction,
    action: string,
    id: string,
    payload: Record<string, unknown>,
  ) {
    await Promise.all([
      this.audit.append(tx, {
        tenantId: this.tenantId(),
        action: `payroll.${action}`,
        module: 'payroll',
        entityType: 'PayrollLockPeriod',
        entityId: id,
        newValue: payload,
      }),
      this.outbox.append(tx, {
        tenantId: this.tenantId(),
        eventKey: `payroll.${action}`,
        payload: { payrollLockId: id, ...payload },
      }),
    ]);
  }

  private periodLock(tx: PrismaTransaction, tenantId: string, period: string) {
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${period}`}))`;
  }

  private tenantId() {
    if (!this.context.tenantId) throw new Error('Tenant context is required');
    return this.context.tenantId;
  }

  private userId() {
    if (!this.context.userId) throw new Error('User context is required');
    return this.context.userId;
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'PAYROLL_LOCK_NOT_FOUND',
      message: 'Payroll lock was not found',
    });
  }
}

export function periodRange(period: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match)
    throw new HttpException(
      { code: 'PAYROLL_PERIOD_INVALID', message: 'Period must be YYYY-MM' },
      422,
    );
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12)
    throw new HttpException(
      { code: 'PAYROLL_PERIOD_INVALID', message: 'Period must be YYYY-MM' },
      422,
    );
  const start = new Date(Date.UTC(year, month - 1, 1));
  return { start, end: new Date(Date.UTC(year, month, 0)) };
}

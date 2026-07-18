import { HttpException, Injectable } from '@nestjs/common';
import { JobStatus, Prisma, SecurityAlertType } from '@prisma/client';
import { DateTime } from 'luxon';
import { AuditService } from '../../../shared/audit/audit.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { TenantJobContextRunner } from '../../../shared/tenancy/tenant-job-context.runner';
import { calculateAttendance } from '../domain/attendance-calculator';
import { DateOnly } from '../domain/value-objects/date-only';
import { AttendanceContextService } from '../application/attendance-context.service';
import { assertAttendanceRangeUnlocked } from '../../../shared/attendance/attendance-lock';

@Injectable()
export class AttendanceJobProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: TenantJobContextRunner,
    private readonly resolver: AttendanceContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  finalizeDay(tenantId: string, attendanceDate: string) {
    return this.runner.run({ tenantId }, async () => {
      const key = `finalize-day:${attendanceDate}`;
      if (
        !(await this.acquireJob(tenantId, 'finalize-day', attendanceDate, key))
      ) {
        return { idempotent: true };
      }
      try {
        const employeeIds = await this.prisma.forTenant((tx) =>
          tx.employee.findMany({
            where: {
              status: 'ACTIVE',
              dateOfJoining: {
                lte: DateOnly.parse(attendanceDate).toDatabaseDate(),
              },
              OR: [
                { dateOfExit: null },
                {
                  dateOfExit: {
                    gte: DateOnly.parse(attendanceDate).toDatabaseDate(),
                  },
                },
              ],
            },
            select: { id: true },
          }),
        );
        let finalized = 0;
        for (const { id } of employeeIds) {
          if (await this.finalizeEmployee(tenantId, id, attendanceDate))
            finalized += 1;
        }
        await this.completeJob(tenantId, key);
        return { idempotent: false, finalized };
      } catch (error) {
        await this.failJob(tenantId, key, error);
        throw error;
      }
    });
  }

  absenteeSweep(tenantId: string, attendanceDate: string) {
    return this.runner.run({ tenantId }, async () => {
      const key = `absentee-sweep:${attendanceDate}`;
      if (
        !(await this.acquireJob(
          tenantId,
          'absentee-sweep',
          attendanceDate,
          key,
        ))
      ) {
        return { idempotent: true };
      }
      try {
        const date = DateOnly.parse(attendanceDate).toDatabaseDate();
        const employees = await this.prisma.forTenant((tx) =>
          tx.employee.findMany({
            where: {
              status: 'ACTIVE',
              dateOfJoining: { lte: date },
              OR: [{ dateOfExit: null }, { dateOfExit: { gte: date } }],
              attendanceDays: { none: { attendanceDate: date } },
            },
            select: { id: true, fullName: true },
          }),
        );
        await this.prisma.forTenant(async (tx) => {
          for (const employee of employees) {
            await tx.securityAlert.create({
              data: {
                tenantId,
                employeeId: employee.id,
                alertType: SecurityAlertType.ABSENTEE,
                title: `${employee.fullName} has not checked in`,
                details: { attendanceDate },
              },
            });
            await this.outbox.append(tx, {
              tenantId,
              eventKey: 'attendance.absentee-detected',
              payload: { employeeId: employee.id, attendanceDate },
            });
          }
          await tx.attendanceJobRun.update({
            where: {
              tenantId_idempotencyKey: { tenantId, idempotencyKey: key },
            },
            data: { status: JobStatus.COMPLETED, completedAt: new Date() },
          });
        });
        return { idempotent: false, alerts: employees.length };
      } catch (error) {
        await this.failJob(tenantId, key, error);
        throw error;
      }
    });
  }

  async ensurePartitions(referenceMonth: string) {
    const reference = DateTime.fromFormat(referenceMonth, 'yyyy-MM', {
      zone: 'utc',
    });
    if (
      !reference.isValid ||
      reference.toFormat('yyyy-MM') !== referenceMonth
    ) {
      throw new Error('PARTITION_MONTH_INVALID');
    }
    for (let offset = 1; offset <= 2; offset += 1) {
      const start = reference.plus({ months: offset }).startOf('month');
      const end = start.plus({ months: 1 });
      const suffix = start.toFormat('yyyy_MM');
      if (!/^\d{4}_\d{2}$/.test(suffix))
        throw new Error('PARTITION_NAME_INVALID');
      await this.prisma.forAdmin((tx) =>
        tx.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS attendance_events_${suffix} PARTITION OF attendance_events FOR VALUES FROM ('${start.toISODate()}') TO ('${end.toISODate()}')`,
        ),
      );
    }
    return { referenceMonth, ensured: 2 };
  }

  recomputeEmployeeDay(
    tenantId: string,
    employeeId: string,
    attendanceDate: string,
  ) {
    return this.runner.run({ tenantId }, () =>
      this.finalizeEmployee(tenantId, employeeId, attendanceDate, true),
    );
  }

  private async finalizeEmployee(
    tenantId: string,
    employeeId: string,
    attendanceDate: string,
    force = false,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: {
          defaultShift: true,
          officeAssignments: {
            where: { isPrimary: true },
            take: 1,
            include: { office: true },
          },
        },
      });
      if (!employee) return false;
      const settings = await tx.tenantSettings.findUniqueOrThrow({
        where: { tenantId },
      });
      const timezone =
        employee.officeAssignments[0]?.office.timezone ?? settings.timezone;
      const evaluationTime = DateTime.fromISO(`${attendanceDate}T23:59:59`, {
        zone: timezone,
      }).toJSDate();
      const runtime = await this.resolver.resolve(tx, employee, evaluationTime);
      const date = DateOnly.parse(attendanceDate).toDatabaseDate();
      if (force) {
        await assertAttendanceRangeUnlocked(tx, date, date, employeeId);
      }
      const initial = await tx.attendanceLog.upsert({
        where: {
          tenantId_employeeId_attendanceDate: {
            tenantId,
            employeeId,
            attendanceDate: date,
          },
        },
        create: { tenantId, employeeId, attendanceDate: date },
        update: {},
      });
      await tx.$queryRaw`SELECT id FROM attendance_logs WHERE id = ${initial.id}::uuid FOR UPDATE`;
      const log = await tx.attendanceLog.findUniqueOrThrow({
        where: { id: initial.id },
        include: { payrollLock: true, events: true },
      });
      if (log.lockedAt || log.payrollLock?.status === 'LOCKED') {
        if (force) {
          throw new HttpException(
            {
              code: 'ATTENDANCE_DAY_LOCKED',
              message: 'Attendance is locked for payroll',
            },
            423,
          );
        }
        return false;
      }
      if (log.finalizedAt && !force) {
        return false;
      }
      const calculation = calculateAttendance({
        attendanceDate,
        timezone,
        policy: runtime.policy,
        shift: runtime.shift,
        events: log.events.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          eventTime: event.eventTime,
          createdAt: event.syncTime,
        })),
        exceptionType: runtime.exceptionType,
        leaveFraction: runtime.leaveFraction,
        holiday: runtime.holiday,
        weeklyOff: runtime.weeklyOff,
        finalizing: true,
        evaluationTime,
      });
      await tx.attendanceLog.update({
        where: { id: log.id },
        data: {
          appliedShiftId: runtime.appliedShiftId,
          firstCheckin: calculation.firstCheckin,
          lastCheckout: calculation.lastCheckout,
          totalWorkMinutes: calculation.totalWorkMinutes,
          lateMinutes: calculation.lateMinutes,
          overtimeMinutes: calculation.overtimeMinutes,
          earlyLeaveMinutes: calculation.earlyLeaveMinutes,
          breakMinutes: calculation.breakMinutes,
          attendanceStatus: calculation.attendanceStatus,
          appliedPolicySnapshot: json(calculation.appliedPolicySnapshot),
          resolvedExceptionId: runtime.exceptionId,
          finalizedAt: new Date(),
        },
      });
      const events = [
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'attendance.day-finalized',
          payload: {
            attendanceLogId: log.id,
            employeeId,
            attendanceDate,
            status: calculation.attendanceStatus,
          },
        }),
        this.audit.append(tx, {
          tenantId,
          action: 'attendance.day-finalized',
          module: 'attendance',
          entityType: 'AttendanceLog',
          entityId: log.id,
          newValue: calculation,
        }),
      ];
      if (calculation.lateMinutes > 0) {
        events.push(
          this.outbox.append(tx, {
            tenantId,
            eventKey: 'attendance.late-marked',
            payload: {
              attendanceLogId: log.id,
              employeeId,
              attendanceDate,
              lateMinutes: calculation.lateMinutes,
            },
          }),
        );
      }
      await Promise.all(events);
      return true;
    });
  }

  private async acquireJob(
    tenantId: string,
    jobType: string,
    attendanceDate: string,
    idempotencyKey: string,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const date = DateOnly.parse(attendanceDate).toDatabaseDate();
      const job = await tx.attendanceJobRun.upsert({
        where: {
          tenantId_idempotencyKey: { tenantId, idempotencyKey },
        },
        create: { tenantId, jobType, attendanceDate: date, idempotencyKey },
        update: {},
      });
      const stale = new Date(Date.now() - 15 * 60_000);
      const acquired = await tx.attendanceJobRun.updateMany({
        where: {
          id: job.id,
          status: { not: JobStatus.COMPLETED },
          OR: [
            { status: { in: [JobStatus.PENDING, JobStatus.FAILED] } },
            { status: JobStatus.RUNNING, startedAt: { lt: stale } },
          ],
        },
        data: {
          status: JobStatus.RUNNING,
          startedAt: new Date(),
          completedAt: null,
          lastError: null,
          attemptCount: { increment: 1 },
        },
      });
      return acquired.count === 1;
    });
  }

  private completeJob(tenantId: string, idempotencyKey: string) {
    return this.runner.run({ tenantId }, () =>
      this.prisma.forTenant((tx) =>
        tx.attendanceJobRun.update({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
          data: { status: JobStatus.COMPLETED, completedAt: new Date() },
        }),
      ),
    );
  }

  private failJob(tenantId: string, idempotencyKey: string, error: unknown) {
    return this.runner.run({ tenantId }, () =>
      this.prisma.forTenant((tx) =>
        tx.attendanceJobRun.update({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
          data: {
            status: JobStatus.FAILED,
            lastError:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : 'Unknown error',
          },
        }),
      ),
    );
  }
}

function json(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

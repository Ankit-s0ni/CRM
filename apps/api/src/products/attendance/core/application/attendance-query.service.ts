import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExceptionType, Prisma, VerificationStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { TenantContextService } from '../../../../platform/tenancy/public';
import { DateOnly } from '../domain/value-objects/date-only';
import { AttendanceRegisterQueryDto } from '../presentation/dto/attendance-query.dto';

@Injectable()
export class AttendanceQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
  ) {}

  register(query: AttendanceRegisterQueryDto, roles: string[]) {
    const range = dateRange(query.startDate, query.endDate, 93);
    return this.prisma.forTenant(async (tx) => {
      const scopedIds = await this.reportingScope(tx, roles);
      const exceptionConditions = query.exceptionType
        ? await this.exceptionLogConditions(
            tx,
            query.exceptionType,
            range.start,
            range.end,
          )
        : undefined;
      const employeeWhere: Prisma.EmployeeWhereInput = {
        AND: [
          ...(query.employeeId ? [{ id: query.employeeId }] : []),
          ...(scopedIds ? [{ id: { in: scopedIds } }] : []),
        ],
        deptId: query.departmentId,
        ...(query.officeId
          ? {
              officeAssignments: {
                some: { officeLocationId: query.officeId },
              },
            }
          : {}),
        ...(query.search?.trim()
          ? {
              OR: [
                {
                  fullName: {
                    contains: query.search.trim(),
                    mode: 'insensitive' as const,
                  },
                },
                {
                  employeeCode: {
                    contains: query.search.trim(),
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      };
      const where: Prisma.AttendanceLogWhereInput = {
        attendanceDate: { gte: range.start, lte: range.end },
        appliedShiftId: query.shiftId,
        attendanceStatus: query.status,
        ...(query.lateOnly ? { lateMinutes: { gt: 0 } } : {}),
        ...(query.missingCheckout
          ? { firstCheckin: { not: null }, lastCheckout: null }
          : {}),
        employee: employeeWhere,
        ...(exceptionConditions?.length
          ? { OR: exceptionConditions }
          : query.exceptionType
            ? { id: { in: [] } }
            : {}),
      };
      const [rows, total, verification] = await Promise.all([
        tx.attendanceLog.findMany({
          where,
          include: {
            employee: {
              include: {
                department: { select: { id: true, name: true } },
                designation: { select: { id: true, name: true } },
                officeAssignments: {
                  where: { isPrimary: true },
                  take: 1,
                  include: {
                    office: { select: { id: true, officeName: true } },
                  },
                },
              },
            },
            appliedShift: { select: { id: true, name: true } },
            payrollLock: { select: { status: true } },
            events: {
              select: {
                source: true,
                isOfflineSync: true,
                timeSuspect: true,
              },
            },
          },
          orderBy: [
            { attendanceDate: 'desc' },
            { employee: { fullName: 'asc' } },
          ],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.attendanceLog.count({ where }),
        tx.attendanceVerificationLog.groupBy({
          by: ['employeeId', 'verificationStatus'],
          where: {
            verifiedAt: {
              gte: range.start,
              lt: new Date(range.end.getTime() + 86_400_000),
            },
          },
          _count: { _all: true },
        }),
      ]);
      const verificationByEmployee = new Map<string, VerificationSummary>();
      for (const item of verification) {
        const current = verificationByEmployee.get(item.employeeId) ?? {
          passed: 0,
          failed: 0,
        };
        if (item.verificationStatus === VerificationStatus.PASSED) {
          current.passed += item._count._all;
        } else {
          current.failed += item._count._all;
        }
        verificationByEmployee.set(item.employeeId, current);
      }
      return {
        data: rows.map((row) => registerRow(row, verificationByEmployee)),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
        },
        summary: await this.registerSummary(tx, where),
      };
    });
  }

  employeeMonth(employeeId: string, month: string, roles: string[]) {
    const range = monthRange(month);
    return this.prisma.forTenant(async (tx) => {
      await this.assertEmployeeAccess(tx, employeeId, roles);
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
      });
      if (!employee) this.notFound();
      const logs = await tx.attendanceLog.findMany({
        where: {
          employeeId,
          attendanceDate: { gte: range.start, lte: range.end },
        },
        include: { appliedShift: { select: { id: true, name: true } } },
        orderBy: { attendanceDate: 'asc' },
      });
      return {
        data: {
          employee,
          month,
          days: logs.map(monthDay),
          summary: summarize(logs),
        },
      };
    });
  }

  day(employeeId: string, date: string, roles: string[]) {
    let attendanceDate: Date;
    try {
      attendanceDate = DateOnly.parse(date).toDatabaseDate();
    } catch {
      throw new BadRequestException({
        code: 'ATTENDANCE_DATE_INVALID',
        message: 'Attendance date must be a valid ISO date',
      });
    }
    return this.prisma.forTenant(async (tx) => {
      await this.assertEmployeeAccess(tx, employeeId, roles);
      const log = await tx.attendanceLog.findFirst({
        where: { employeeId, attendanceDate },
        include: {
          employee: {
            include: {
              department: { select: { id: true, name: true } },
              designation: { select: { id: true, name: true } },
            },
          },
          appliedShift: { select: { id: true, name: true } },
          payrollLock: { select: { status: true } },
          events: { orderBy: [{ eventTime: 'asc' }, { syncTime: 'asc' }] },
        },
      });
      if (!log) this.notFound();
      const exception = log.resolvedExceptionId
        ? await tx.attendanceException.findUnique({
            where: { id: log.resolvedExceptionId },
          })
        : null;
      return {
        data: {
          ...monthDay(log),
          employee: log.employee,
          appliedPolicySnapshot: log.appliedPolicySnapshot,
          exception,
          isLocked: !!log.lockedAt || log.payrollLock?.status === 'LOCKED',
          timeline: log.events.map((event) => ({
            id: event.id,
            eventType: event.eventType,
            source: event.source,
            eventTime: event.eventTime,
            syncTime: event.syncTime,
            isOfflineSync: event.isOfflineSync,
            timeSuspect: event.timeSuspect,
          })),
        },
      };
    });
  }

  private async reportingScope(tx: PrismaTransactionLike, roles: string[]) {
    if (!roles.includes('MANAGER')) return null;
    const manager = await tx.employee.findFirst({
      where: { userId: this.context.userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!manager) return [];
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      WITH RECURSIVE reports AS (
        SELECT id FROM employees WHERE id = ${manager.id}::uuid
        UNION ALL
        SELECT employee.id
        FROM employees employee
        JOIN reports manager_row ON employee."managerId" = manager_row.id
      )
      SELECT id FROM reports
    `;
    return rows.map(({ id }) => id);
  }

  private async assertEmployeeAccess(
    tx: PrismaTransactionLike,
    employeeId: string,
    roles: string[],
  ) {
    const scope = await this.reportingScope(tx, roles);
    if (scope && !scope.includes(employeeId)) this.notFound();
  }

  private async exceptionLogConditions(
    tx: PrismaTransactionLike,
    exceptionType: ExceptionType,
    start: Date,
    end: Date,
  ): Promise<Prisma.AttendanceLogWhereInput[]> {
    const exceptions = await tx.attendanceException.findMany({
      where: {
        exceptionType,
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { employeeId: true, startDate: true, endDate: true },
    });
    return exceptions.map((exception) => ({
      employeeId: exception.employeeId,
      attendanceDate: {
        gte: exception.startDate > start ? exception.startDate : start,
        lte: exception.endDate < end ? exception.endDate : end,
      },
    }));
  }

  private async registerSummary(
    tx: PrismaTransactionLike,
    where: Prisma.AttendanceLogWhereInput,
  ) {
    const [status, totals] = await Promise.all([
      tx.attendanceLog.groupBy({
        by: ['attendanceStatus'],
        where,
        _count: { _all: true },
      }),
      tx.attendanceLog.aggregate({
        where,
        _sum: {
          totalWorkMinutes: true,
          lateMinutes: true,
          overtimeMinutes: true,
        },
      }),
    ]);
    return {
      statuses: Object.fromEntries(
        status.map((item) => [item.attendanceStatus, item._count._all]),
      ),
      totals: totals._sum,
    };
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'ATTENDANCE_NOT_FOUND',
      message: 'Attendance record was not found',
    });
  }
}

type PrismaTransactionLike = Parameters<
  Parameters<PrismaService['forTenant']>[0]
>[0];
type VerificationSummary = { passed: number; failed: number };

function registerRow(
  row: Prisma.AttendanceLogGetPayload<{
    include: {
      employee: {
        include: {
          department: { select: { id: true; name: true } };
          designation: { select: { id: true; name: true } };
          officeAssignments: {
            include: {
              office: { select: { id: true; officeName: true } };
            };
          };
        };
      };
      appliedShift: { select: { id: true; name: true } };
      payrollLock: { select: { status: true } };
      events: {
        select: { source: true; isOfflineSync: true; timeSuspect: true };
      };
    };
  }>,
  verification: Map<string, VerificationSummary>,
) {
  return {
    id: row.id,
    attendanceDate: row.attendanceDate.toISOString().slice(0, 10),
    employee: {
      id: row.employee.id,
      employeeCode: row.employee.employeeCode,
      fullName: row.employee.fullName,
      department: row.employee.department,
      designation: row.employee.designation,
      office: row.employee.officeAssignments[0]?.office ?? null,
    },
    shift: row.appliedShift,
    status: row.attendanceStatus,
    firstCheckin: row.firstCheckin,
    lastCheckout: row.lastCheckout,
    workMinutes: row.totalWorkMinutes,
    breakMinutes: row.breakMinutes,
    lateMinutes: row.lateMinutes,
    overtimeMinutes: row.overtimeMinutes,
    earlyLeaveMinutes: row.earlyLeaveMinutes,
    isLocked: !!row.lockedAt || row.payrollLock?.status === 'LOCKED',
    evidence: {
      verification: verification.get(row.employeeId) ?? {
        passed: 0,
        failed: 0,
      },
      sources: [...new Set(row.events.map(({ source }) => source))],
      hasOfflineSync: row.events.some(({ isOfflineSync }) => isOfflineSync),
      timeSuspect: row.events.some(({ timeSuspect }) => timeSuspect),
    },
  };
}

function monthDay(row: {
  id: string;
  attendanceDate: Date;
  attendanceStatus: string;
  firstCheckin: Date | null;
  lastCheckout: Date | null;
  totalWorkMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  earlyLeaveMinutes: number;
  finalizedAt: Date | null;
  lockedAt: Date | null;
  appliedShift?: { id: string; name: string } | null;
}) {
  return {
    id: row.id,
    date: row.attendanceDate.toISOString().slice(0, 10),
    status: row.attendanceStatus,
    firstCheckin: row.firstCheckin,
    lastCheckout: row.lastCheckout,
    workMinutes: row.totalWorkMinutes,
    breakMinutes: row.breakMinutes,
    lateMinutes: row.lateMinutes,
    overtimeMinutes: row.overtimeMinutes,
    earlyLeaveMinutes: row.earlyLeaveMinutes,
    shift: row.appliedShift ?? null,
    finalizedAt: row.finalizedAt,
    lockedAt: row.lockedAt,
  };
}

function dateRange(startText: string, endText: string, maximumDays: number) {
  let start: Date;
  let end: Date;
  try {
    start = DateOnly.parse(startText).toDatabaseDate();
    end = DateOnly.parse(endText).toDatabaseDate();
  } catch {
    throw new BadRequestException({
      code: 'ATTENDANCE_RANGE_INVALID',
      message: 'Attendance dates must be valid ISO dates',
    });
  }
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days < 1 || days > maximumDays) {
    throw new BadRequestException({
      code: 'ATTENDANCE_RANGE_INVALID',
      message: `Attendance range must contain 1 to ${maximumDays} days`,
    });
  }
  return { start, end };
}

function monthRange(month: string) {
  const value = DateTime.fromFormat(month, 'yyyy-MM', { zone: 'utc' });
  if (!value.isValid || value.toFormat('yyyy-MM') !== month) {
    throw new BadRequestException({
      code: 'ATTENDANCE_MONTH_INVALID',
      message: 'Month must use YYYY-MM',
    });
  }
  return {
    start: DateOnly.parse(value.startOf('month').toISODate()).toDatabaseDate(),
    end: DateOnly.parse(value.endOf('month').toISODate()).toDatabaseDate(),
  };
}

function summarize(
  logs: Array<{
    attendanceStatus: string;
    totalWorkMinutes: number;
    lateMinutes: number;
    overtimeMinutes: number;
  }>,
) {
  return {
    days: logs.length,
    present: logs.filter((log) =>
      ['PRESENT', 'PRESENT_OPEN', 'ON_DUTY'].includes(log.attendanceStatus),
    ).length,
    absent: logs.filter(({ attendanceStatus }) => attendanceStatus === 'ABSENT')
      .length,
    halfDays: logs.filter(
      ({ attendanceStatus }) => attendanceStatus === 'HALF_DAY',
    ).length,
    lateDays: logs.filter(({ lateMinutes }) => lateMinutes > 0).length,
    workMinutes: logs.reduce((sum, row) => sum + row.totalWorkMinutes, 0),
    overtimeMinutes: logs.reduce((sum, row) => sum + row.overtimeMinutes, 0),
  };
}

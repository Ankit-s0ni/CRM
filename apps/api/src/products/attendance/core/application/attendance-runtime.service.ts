import {
  ConflictException,
  HttpException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventType, Prisma, PunchSource } from '@prisma/client';
import { DateTime } from 'luxon';
import { AuditService } from '../../../../platform/audit/public';
import {
  PrismaService,
  PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContextService } from '../../../../platform/tenancy/public';
import {
  AttendanceDay,
  AttendanceTransitionError,
} from '../domain/attendance-day.aggregate';
import { calculateAttendance } from '../domain/attendance-calculator';
import { DateOnly } from '../domain/value-objects/date-only';
import { assertAttendanceRangeUnlocked } from '../../../../shared/attendance/attendance-lock';
import { TimeWindow } from '../domain/value-objects/time-window';
import {
  AttendanceContextService,
  ResolvedAttendanceContext,
} from './attendance-context.service';

type PunchMetadata = {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  source?: PunchSource;
  verificationLogId?: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  isOfflineSync?: boolean;
  timeSuspect?: boolean;
};

@Injectable()
export class AttendanceRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly resolver: AttendanceContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  punch(eventType: EventType, metadata: PunchMetadata, now = new Date()) {
    return this.prisma.forTenant((tx) =>
      this.punchInTransaction(tx, eventType, metadata, now),
    );
  }

  async punchInTransaction(
    tx: PrismaTransaction,
    eventType: EventType,
    metadata: PunchMetadata,
    now = new Date(),
  ) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const employee = await this.resolver.employeeForUser(tx, userId);
    const runtime = await this.resolver.resolve(tx, employee, now);
    this.assertEmployeeDate(runtime);
    const attendanceDate = runtime.attendanceDate.toDatabaseDate();
    await assertAttendanceRangeUnlocked(
      tx,
      attendanceDate,
      attendanceDate,
      employee.id,
    );
    const initialLog = await tx.attendanceLog.upsert({
      where: {
        tenantId_employeeId_attendanceDate: {
          tenantId,
          employeeId: employee.id,
          attendanceDate,
        },
      },
      create: {
        tenantId,
        employeeId: employee.id,
        attendanceDate,
        appliedShiftId: runtime.appliedShiftId,
        appliedPolicySnapshot: json(runtime.policy),
        resolvedExceptionId: runtime.exceptionId,
      },
      update: {},
    });
    await tx.$queryRaw`SELECT id FROM attendance_logs WHERE id = ${initialLog.id}::uuid FOR UPDATE`;
    const log = await tx.attendanceLog.findUniqueOrThrow({
      where: { id: initialLog.id },
      include: {
        payrollLock: true,
        events: { orderBy: [{ eventTime: 'asc' }, { syncTime: 'asc' }] },
      },
    });
    this.assertUnlocked(log);
    const replay = metadata.requestId
      ? log.events.find((event) => event.clientEventUuid === metadata.requestId)
      : undefined;
    if (replay) {
      if (replay.eventType !== eventType) {
        throw new ConflictException({
          code: 'ATTENDANCE_EVENT_CONFLICT',
          message:
            'The request ID is already used by another attendance action',
        });
      }
      return this.todayResponse(runtime, log, true, now);
    }

    const aggregate = this.restoreAggregate(log.events);
    this.assertTransition(aggregate, eventType);
    this.assertPunchWindow(runtime, eventType, now);
    const event = await tx.attendanceEvent.create({
      data: {
        tenantId,
        attendanceLogId: log.id,
        employeeId: employee.id,
        clientEventUuid: metadata.requestId,
        verificationLogId: metadata.verificationLogId,
        eventType,
        source: metadata.source ?? PunchSource.WEB,
        eventTime: now,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        accuracyM: metadata.accuracyM,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        isOfflineSync: metadata.isOfflineSync ?? false,
        timeSuspect: metadata.timeSuspect ?? false,
        createdBy: userId,
      },
    });
    if (eventType === EventType.CHECKOUT) {
      await tx.fieldTrackingSession.updateMany({
        where: { employeeId: employee.id, endedAt: null },
        data: {
          endedAt: now,
          endReason: 'CHECKOUT',
        },
      });
    }
    const calculation = calculateAttendance({
      attendanceDate: runtime.attendanceDate.value,
      timezone: runtime.timezone,
      policy: runtime.policy,
      shift: runtime.shift,
      events: [...log.events, event].map(domainEvent),
      exceptionType: runtime.exceptionType,
      holiday: runtime.holiday,
      weeklyOff: runtime.weeklyOff,
      finalizing: false,
      evaluationTime: now,
    });
    const updated = await tx.attendanceLog.update({
      where: { id: log.id },
      data: calculatedLogData(calculation, runtime),
      include: {
        payrollLock: true,
        events: { orderBy: [{ eventTime: 'asc' }, { syncTime: 'asc' }] },
      },
    });
    await Promise.all([
      this.audit.appendEmployeeActivity(tx, {
        tenantId,
        employeeId: employee.id,
        action: `attendance.${eventKey(eventType)}`,
        module: 'attendance',
        entityType: 'AttendanceLog',
        entityId: log.id,
        newValue: {
          eventId: event.id,
          eventType,
          attendanceDate: runtime.attendanceDate.value,
        },
      }),
      this.outbox.append(tx, {
        tenantId,
        eventKey: `attendance.${eventKey(eventType)}`,
        payload: {
          attendanceLogId: log.id,
          employeeId: employee.id,
          attendanceDate: runtime.attendanceDate.value,
          eventId: event.id,
        },
      }),
    ]);
    return this.todayResponse(runtime, updated, false, now);
  }

  today(now = new Date()) {
    const userId = this.requireUserId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.resolver.employeeForUser(tx, userId);
      const runtime = await this.resolver.resolve(tx, employee, now);
      const log = await tx.attendanceLog.findFirst({
        where: {
          employeeId: employee.id,
          attendanceDate: runtime.attendanceDate.toDatabaseDate(),
        },
        include: {
          payrollLock: true,
          events: { orderBy: [{ eventTime: 'asc' }, { syncTime: 'asc' }] },
        },
      });
      const response = this.todayResponse(runtime, log, false, now);
      const localDate = DateTime.fromISO(runtime.attendanceDate.value, {
        zone: runtime.timezone,
      });
      const weekStart = localDate.startOf('week');
      const weekEnd = weekStart.plus({ days: 6 });
      const weekStartDate = weekStart.toISODate()!;
      const weekEndDate = weekEnd.toISODate()!;
      const office = runtime.employee.officeAssignments[0]?.office;
      const [weekLogs, holidays, nextHoliday] = await Promise.all([
        tx.attendanceLog.findMany({
          where: {
            employeeId: employee.id,
            attendanceDate: {
              gte: DateOnly.parse(weekStartDate).toDatabaseDate(),
              lte: DateOnly.parse(weekEndDate).toDatabaseDate(),
            },
          },
          select: {
            attendanceDate: true,
            totalWorkMinutes: true,
            lateMinutes: true,
            overtimeMinutes: true,
          },
        }),
        tx.tenantHoliday.findMany({
          where: {
            holidayDate: {
              gte: DateOnly.parse(weekStartDate).toDatabaseDate(),
              lte: DateOnly.parse(weekEndDate).toDatabaseDate(),
            },
            OR: [
              { officeLocationId: null },
              ...(office ? [{ officeLocationId: office.id }] : []),
            ],
          },
          select: { holidayDate: true },
        }),
        tx.tenantHoliday.findFirst({
          where: {
            holidayDate: { gt: runtime.attendanceDate.toDatabaseDate() },
            OR: [
              { officeLocationId: null },
              ...(office ? [{ officeLocationId: office.id }] : []),
            ],
          },
          orderBy: { holidayDate: 'asc' },
          select: { holidayName: true, holidayDate: true },
        }),
      ]);
      const holidayDates = new Set(
        holidays.map(({ holidayDate }) =>
          holidayDate.toISOString().slice(0, 10),
        ),
      );
      const scheduledDays = Array.from({ length: 7 }, (_, index) =>
        weekStart.plus({ days: index }).toISODate()!,
      ).filter(
        (date) =>
          !holidayDates.has(date) &&
          !isConfiguredWeeklyOff(runtime.weeklyOffs, date, runtime.timezone),
      ).length;
      const todayKey = runtime.attendanceDate.value;
      const previousLogs = weekLogs.filter(
        ({ attendanceDate }) =>
          attendanceDate.toISOString().slice(0, 10) !== todayKey,
      );
      return {
        ...response,
        data: {
          ...response.data,
          workplace: office
            ? {
                id: office.id,
                name: office.officeName,
                radiusMeters: office.radiusMeters,
                timezone: office.timezone ?? runtime.timezone,
              }
            : null,
          workOverview: {
            weekStart: weekStartDate,
            weekEnd: weekEndDate,
            workMinutes:
              previousLogs.reduce(
                (sum, item) => sum + item.totalWorkMinutes,
                0,
              ) + response.data.totals.workMinutes,
            targetMinutes: scheduledDays * runtime.policy.minimumWorkMinutes,
            lateMinutes:
              previousLogs.reduce((sum, item) => sum + item.lateMinutes, 0) +
              response.data.totals.lateMinutes,
            overtimeMinutes:
              previousLogs.reduce(
                (sum, item) => sum + item.overtimeMinutes,
                0,
              ) + response.data.totals.overtimeMinutes,
          },
          nextHoliday: nextHoliday
            ? {
                name: nextHoliday.holidayName,
                date: nextHoliday.holidayDate.toISOString().slice(0, 10),
              }
            : null,
        },
      };
    });
  }

  history(month: string) {
    const userId = this.requireUserId();
    const range = monthRange(month);
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.resolver.employeeForUser(tx, userId);
      const logs = await tx.attendanceLog.findMany({
        where: {
          employeeId: employee.id,
          attendanceDate: { gte: range.start, lte: range.end },
        },
        orderBy: { attendanceDate: 'desc' },
        select: {
          id: true,
          attendanceDate: true,
          attendanceStatus: true,
          firstCheckin: true,
          lastCheckout: true,
          totalWorkMinutes: true,
          lateMinutes: true,
          overtimeMinutes: true,
          breakMinutes: true,
          finalizedAt: true,
          lockedAt: true,
        },
      });
      return {
        data: logs.map((log) => ({
          ...log,
          attendanceDate: log.attendanceDate.toISOString().slice(0, 10),
        })),
        summary: summarizeLogs(logs),
      };
    });
  }

  day(date: string) {
    const userId = this.requireUserId();
    const attendanceDate = DateOnly.parse(date).toDatabaseDate();
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.resolver.employeeForUser(tx, userId);
      const log = await tx.attendanceLog.findFirst({
        where: { employeeId: employee.id, attendanceDate },
        include: {
          appliedShift: { select: { id: true, name: true } },
          payrollLock: { select: { status: true } },
          events: { orderBy: [{ eventTime: 'asc' }, { syncTime: 'asc' }] },
        },
      });
      return {
        data: {
          attendanceDate: date,
          status: log?.attendanceStatus ?? 'ABSENT',
          firstCheckin: log?.firstCheckin ?? null,
          lastCheckout: log?.lastCheckout ?? null,
          totals: {
            workMinutes: log?.totalWorkMinutes ?? 0,
            breakMinutes: log?.breakMinutes ?? 0,
            lateMinutes: log?.lateMinutes ?? 0,
            overtimeMinutes: log?.overtimeMinutes ?? 0,
          },
          shift: log?.appliedShift ?? null,
          isLocked: !!log?.lockedAt || log?.payrollLock?.status === 'LOCKED',
          timeline: (log?.events ?? []).map(safeEvent),
        },
      };
    });
  }

  private todayResponse(
    runtime: ResolvedAttendanceContext,
    log: AttendanceLogWithEvents | null,
    idempotent: boolean,
    now: Date,
  ) {
    const calculation = calculateAttendance({
      attendanceDate: runtime.attendanceDate.value,
      timezone: runtime.timezone,
      policy: runtime.policy,
      shift: runtime.shift,
      events: log?.events.map(domainEvent) ?? [],
      exceptionType: runtime.exceptionType,
      holiday: runtime.holiday,
      weeklyOff: runtime.weeklyOff,
      finalizing: !!log?.finalizedAt,
      evaluationTime: now,
    });
    const state = AttendanceDay.restore(
      log?.events.map(domainEvent) ?? [],
    ).currentState;
    return {
      data: {
        id: log?.id ?? null,
        attendanceDate: runtime.attendanceDate.value,
        timezone: runtime.timezone,
        status: log?.attendanceStatus ?? calculation.attendanceStatus,
        openAction:
          state === 'CLOSED'
            ? 'CHECKIN'
            : state === 'ON_BREAK'
              ? 'BREAK_END'
              : 'CHECKOUT',
        canStartBreak: state === 'OPEN',
        isLocked: !!log?.lockedAt || log?.payrollLock?.status === 'LOCKED',
        totals: {
          workMinutes: calculation.totalWorkMinutes,
          payableMinutes: calculation.payableMinutes,
          breakMinutes: calculation.breakMinutes,
          lateMinutes: calculation.lateMinutes,
          overtimeMinutes: calculation.overtimeMinutes,
          earlyLeaveMinutes: calculation.earlyLeaveMinutes,
        },
        shift: runtime.shift,
        policy: runtime.policy,
        exceptionType: runtime.exceptionType,
        holiday: runtime.holiday,
        weeklyOff: runtime.weeklyOff,
        anomalies: calculation.anomalies,
        timeline: (log?.events ?? []).map(safeEvent),
      },
      idempotent,
    };
  }

  private restoreAggregate(events: AttendanceLogWithEvents['events']) {
    try {
      return AttendanceDay.restore(events.map(domainEvent));
    } catch {
      throw new ConflictException({
        code: 'ATTENDANCE_EVENT_CONFLICT',
        message: 'Attendance evidence contains an invalid transition sequence',
      });
    }
  }

  private assertTransition(aggregate: AttendanceDay, eventType: EventType) {
    try {
      aggregate.assertCanAppend(eventType);
    } catch (error) {
      if (error instanceof AttendanceTransitionError) {
        throw new ConflictException({
          code: error.code,
          message: transitionMessage(error.code),
        });
      }
      throw error;
    }
  }

  private assertPunchWindow(
    runtime: ResolvedAttendanceContext,
    eventType: EventType,
    now: Date,
  ) {
    if (!runtime.shift) return;
    const bounds = TimeWindow.create(
      runtime.shift.startTime,
      runtime.shift.endTime,
    ).bounds(runtime.attendanceDate, runtime.shift.timezone);
    const instant = DateTime.fromJSDate(now);
    const earlyCheckin =
      eventType === EventType.CHECKIN &&
      runtime.policy.allowEarlyCheckin === false &&
      instant < bounds.start;
    const earlyCheckout =
      eventType === EventType.CHECKOUT &&
      runtime.policy.allowEarlyCheckout === false &&
      instant < bounds.end;
    if (earlyCheckin || earlyCheckout) {
      throw new UnprocessableEntityException({
        code: 'PUNCH_OUTSIDE_ALLOWED_WINDOW',
        message:
          'This attendance action is outside the configured shift window',
      });
    }
  }

  private assertUnlocked(log: {
    lockedAt: Date | null;
    payrollLock: { status: string } | null;
  }) {
    if (log.lockedAt || log.payrollLock?.status === 'LOCKED') {
      throw new HttpException(
        {
          code: 'ATTENDANCE_DAY_LOCKED',
          message: 'Attendance is locked for payroll',
        },
        423,
      );
    }
  }

  private assertEmployeeDate(runtime: ResolvedAttendanceContext) {
    const date = runtime.attendanceDate.toDatabaseDate();
    if (
      runtime.employee.dateOfJoining > date ||
      (runtime.employee.dateOfExit && runtime.employee.dateOfExit < date)
    ) {
      throw new UnprocessableEntityException({
        code: 'EMPLOYEE_DATE_INACTIVE',
        message: 'Employee is not active on the attributed attendance date',
      });
    }
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

type AttendanceLogWithEvents = Prisma.AttendanceLogGetPayload<{
  include: { payrollLock: true; events: true };
}>;

function calculatedLogData(
  calculation: ReturnType<typeof calculateAttendance>,
  runtime: ResolvedAttendanceContext,
): Prisma.AttendanceLogUpdateInput {
  return {
    appliedShift: runtime.appliedShiftId
      ? { connect: { id: runtime.appliedShiftId } }
      : { disconnect: true },
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
  };
}

function domainEvent(event: {
  id: string;
  eventType: EventType;
  eventTime: Date;
  syncTime: Date;
}) {
  return {
    id: event.id,
    eventType: event.eventType,
    eventTime: event.eventTime,
    createdAt: event.syncTime,
  };
}

function safeEvent(event: AttendanceLogWithEvents['events'][number]) {
  return {
    id: event.id,
    eventType: event.eventType,
    source: event.source,
    eventTime: event.eventTime,
    isOfflineSync: event.isOfflineSync,
    timeSuspect: event.timeSuspect,
  };
}

function eventKey(eventType: EventType) {
  return eventType.toLowerCase().replace('_', '-');
}

function transitionMessage(code: string) {
  const messages: Record<string, string> = {
    ATTENDANCE_ALREADY_OPEN: 'Attendance is already open',
    ATTENDANCE_NOT_OPEN: 'Attendance is not open',
    BREAK_ALREADY_OPEN: 'A break is already open',
    BREAK_NOT_OPEN: 'No break is currently open',
  };
  return messages[code] ?? 'Attendance transition is not allowed';
}

function json(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function monthRange(month: string) {
  const start = DateTime.fromFormat(month, 'yyyy-MM', { zone: 'utc' });
  if (!start.isValid || start.toFormat('yyyy-MM') !== month) {
    throw new UnprocessableEntityException({
      code: 'ATTENDANCE_MONTH_INVALID',
      message: 'Month must use YYYY-MM',
    });
  }
  return {
    start: DateOnly.parse(start.toISODate()).toDatabaseDate(),
    end: DateOnly.parse(start.endOf('month').toISODate()).toDatabaseDate(),
  };
}

function summarizeLogs(
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
    absent: logs.filter((log) => log.attendanceStatus === 'ABSENT').length,
    halfDays: logs.filter((log) => log.attendanceStatus === 'HALF_DAY').length,
    lateDays: logs.filter((log) => log.lateMinutes > 0).length,
    workMinutes: logs.reduce((sum, log) => sum + log.totalWorkMinutes, 0),
    overtimeMinutes: logs.reduce((sum, log) => sum + log.overtimeMinutes, 0),
  };
}

function isConfiguredWeeklyOff(
  value: Prisma.JsonValue,
  date: string,
  timezone: string,
) {
  if (!Array.isArray(value)) return false;
  const local = DateTime.fromISO(date, { zone: timezone });
  const weekday = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][
    local.weekday - 1
  ];
  const occurrence = Math.ceil(local.day / 7);
  return value.some((entry) => {
    if (entry === weekday) return true;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return false;
    }
    return (
      entry.weekday === weekday &&
      (entry.occurrences === undefined ||
        (Array.isArray(entry.occurrences) &&
          entry.occurrences.includes(occurrence)))
    );
  });
}

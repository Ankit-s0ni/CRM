import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  EmployeeStatus,
  EventType,
  Prisma,
  RequestStatus,
  SecurityAlertType,
  WorkType,
} from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  AttendanceDashboardQueryDto,
  DashboardEmployeeStatus,
} from './dto/attendance-dashboard-query.dto';

const PRESENT_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.PRESENT_OPEN,
  AttendanceStatus.PRESENT,
  AttendanceStatus.HALF_DAY,
  AttendanceStatus.ON_DUTY,
];

const OFF_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.ON_LEAVE,
  AttendanceStatus.HOLIDAY,
  AttendanceStatus.WEEKLY_OFF,
];

@Injectable()
export class AttendanceDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
  ) {}

  get(query: AttendanceDashboardQueryDto) {
    const tenantId = this.context.tenantId;
    if (!tenantId) throw new Error('Tenant context is required');

    return this.prisma.forTenant(async (tx) => {
      const settings = await tx.tenantSettings.findUnique({
        where: { tenantId },
        select: { timezone: true },
      });
      const timezone = settings?.timezone ?? 'UTC';
      const dateText = query.date ?? tenantLocalDate(new Date(), timezone);
      const attendanceDate = parseDateOnly(dateText);
      const employeeWhere = this.employeeWhere(query, attendanceDate);
      const take = query.limit ?? 24;

      const [
        allLogs,
        activeEmployees,
        employees,
        pendingRegularizations,
        alerts,
      ] = await Promise.all([
        tx.attendanceLog.findMany({
          where: { attendanceDate },
          select: {
            attendanceStatus: true,
            lateMinutes: true,
            employee: { select: { workType: true } },
            events: {
              orderBy: [{ eventTime: 'desc' }, { syncTime: 'desc' }],
              take: 1,
              select: { eventType: true },
            },
          },
        }),
        tx.employee.count({
          where: activeEmployeeWhere(attendanceDate),
        }),
        tx.employee.findMany({
          where: employeeWhere,
          include: {
            department: { select: { id: true, name: true } },
            designation: { select: { name: true } },
            officeAssignments: {
              orderBy: { isPrimary: 'desc' },
              take: 1,
              include: { office: { select: { id: true, officeName: true } } },
            },
            attendanceDays: {
              where: { attendanceDate },
              take: 1,
              include: {
                appliedShift: { select: { id: true, name: true } },
                events: {
                  orderBy: [{ eventTime: 'desc' }, { syncTime: 'desc' }],
                  take: 1,
                  select: { eventType: true },
                },
              },
            },
          },
          orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
          ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
          take: Math.min(take * 3 + 1, 301),
        }),
        tx.regularizationRequest.count({
          where: { status: RequestStatus.PENDING },
        }),
        tx.securityAlert.groupBy({
          by: ['alertType'],
          where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
          _count: { _all: true },
        }),
      ]);

      const mappedEmployees = employees
        .map((employee) => this.serializeEmployee(employee))
        .filter(
          (employee) =>
            !query.status?.length || query.status.includes(employee.status),
        );
      const page = mappedEmployees.slice(0, take);
      const nextCursor =
        mappedEmployees.length > take || employees.length > take
          ? (page.at(-1)?.id ?? null)
          : null;
      const absenteeAlerts = alertCount(alerts, SecurityAlertType.ABSENTEE);
      const securityViolations = alerts.reduce(
        (total, item) =>
          item.alertType === SecurityAlertType.ABSENTEE
            ? total
            : total + item._count._all,
        0,
      );

      return {
        data: {
          date: dateText,
          timezone,
          summary: summarize(allLogs, activeEmployees),
          employees: page,
          attention: {
            pendingRegularizations,
            openSecurityViolations: securityViolations,
            absenteeAlerts,
          },
          updatedAt: new Date().toISOString(),
          nextCursor,
        },
      };
    });
  }

  private employeeWhere(
    query: AttendanceDashboardQueryDto,
    attendanceDate: Date,
  ): Prisma.EmployeeWhereInput {
    const search = query.search?.trim();
    const statusFilters = query.status?.flatMap((status) =>
      dashboardStatusWhere(status, attendanceDate),
    );
    return {
      ...activeEmployeeWhere(attendanceDate),
      deptId: query.departmentId,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' as const } },
              {
                employeeCode: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(statusFilters?.length ? { AND: [{ OR: statusFilters }] } : {}),
    };
  }

  private serializeEmployee(employee: DashboardEmployee) {
    const log = employee.attendanceDays[0];
    const status = employeeDashboardStatus(employee.workType, log);
    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      designation: employee.designation?.name ?? null,
      department: employee.department,
      workType: employee.workType,
      status,
      lateMinutes: log?.lateMinutes ?? 0,
      checkinTime: log?.firstCheckin?.toISOString() ?? null,
      office: employee.officeAssignments[0]?.office ?? null,
      shift: log?.appliedShift ?? null,
    };
  }
}

type DashboardEmployee = Prisma.EmployeeGetPayload<{
  include: {
    department: { select: { id: true; name: true } };
    designation: { select: { name: true } };
    officeAssignments: {
      include: { office: { select: { id: true; officeName: true } } };
    };
    attendanceDays: {
      include: {
        appliedShift: { select: { id: true; name: true } };
        events: { select: { eventType: true } };
      };
    };
  };
}>;

type DashboardLog = {
  attendanceStatus: AttendanceStatus;
  lateMinutes: number;
  employee: { workType: WorkType };
  events: Array<{ eventType: EventType }>;
};

function summarize(logs: DashboardLog[], activeEmployees: number) {
  const present = logs.filter((log) =>
    PRESENT_STATUSES.includes(log.attendanceStatus),
  ).length;
  return {
    present,
    late: logs.filter((log) => log.lateMinutes > 0).length,
    absent: logs.filter(
      (log) => log.attendanceStatus === AttendanceStatus.ABSENT,
    ).length,
    onField: logs.filter(
      (log) =>
        log.employee.workType === WorkType.FIELD &&
        PRESENT_STATUSES.includes(log.attendanceStatus),
    ).length,
    onBreak: logs.filter(
      (log) => log.events[0]?.eventType === EventType.BREAK_START,
    ).length,
    notYetIn: Math.max(0, activeEmployees - logs.length),
  };
}

function employeeDashboardStatus(
  workType: WorkType,
  log: DashboardEmployee['attendanceDays'][number] | undefined,
) {
  if (!log) return DashboardEmployeeStatus.NOT_YET_IN;
  if (log.attendanceStatus === AttendanceStatus.ABSENT)
    return DashboardEmployeeStatus.ABSENT;
  if (OFF_STATUSES.includes(log.attendanceStatus))
    return DashboardEmployeeStatus.OFF;
  if (log.events[0]?.eventType === EventType.BREAK_START)
    return DashboardEmployeeStatus.ON_BREAK;
  if (
    workType === WorkType.FIELD &&
    PRESENT_STATUSES.includes(log.attendanceStatus)
  )
    return DashboardEmployeeStatus.ON_FIELD;
  if (log.lateMinutes > 0) return DashboardEmployeeStatus.LATE;
  return DashboardEmployeeStatus.CLOCKED_IN;
}

function dashboardStatusWhere(
  status: DashboardEmployeeStatus,
  attendanceDate: Date,
): Prisma.EmployeeWhereInput[] {
  const attendanceDays = (where: Prisma.AttendanceLogWhereInput) => ({
    attendanceDays: { some: { attendanceDate, ...where } },
  });
  switch (status) {
    case DashboardEmployeeStatus.NOT_YET_IN:
      return [{ attendanceDays: { none: { attendanceDate } } }];
    case DashboardEmployeeStatus.ABSENT:
      return [attendanceDays({ attendanceStatus: AttendanceStatus.ABSENT })];
    case DashboardEmployeeStatus.ON_FIELD:
      return [
        {
          workType: WorkType.FIELD,
          ...attendanceDays({ attendanceStatus: { in: PRESENT_STATUSES } }),
        },
      ];
    case DashboardEmployeeStatus.ON_BREAK:
      return [
        attendanceDays({
          events: { some: { eventType: EventType.BREAK_START } },
        }),
      ];
    case DashboardEmployeeStatus.LATE:
      return [attendanceDays({ lateMinutes: { gt: 0 } })];
    case DashboardEmployeeStatus.OFF:
      return [attendanceDays({ attendanceStatus: { in: OFF_STATUSES } })];
    case DashboardEmployeeStatus.CLOCKED_IN:
      return [attendanceDays({ attendanceStatus: { in: PRESENT_STATUSES } })];
  }
}

function activeEmployeeWhere(attendanceDate: Date): Prisma.EmployeeWhereInput {
  return {
    status: EmployeeStatus.ACTIVE,
    dateOfJoining: { lte: attendanceDate },
    OR: [{ dateOfExit: null }, { dateOfExit: { gte: attendanceDate } }],
  };
}

function tenantLocalDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function parseDateOnly(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException({
      code: 'ATTENDANCE_DATE_INVALID',
      message: 'Dashboard date must be a valid ISO date',
    });
  }
  return parsed;
}

function alertCount(
  alerts: Array<{ alertType: SecurityAlertType; _count: { _all: number } }>,
  type: SecurityAlertType,
) {
  return alerts.find((item) => item.alertType === type)?._count._all ?? 0;
}

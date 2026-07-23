import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  EmployeeStatus,
  EventType,
  Prisma,
  RequestStatus,
  SecurityAlertType,
  WorkType,
  TokenPurpose,
  DeviceStatus,
  UserStatus,
} from '@prisma/client';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { TenantContextService } from '../../../platform/tenancy/public';
import { collectReportingEmployeeIds } from '../../../platform/organization/public';
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

  get(
    query: AttendanceDashboardQueryDto,
    userId: string,
    permissions: Set<string>,
  ) {
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
      const accessibleIds = await this.accessibleEmployeeIds(tx, userId);
      const employeeWhere = scopeEmployeeWhere(
        this.employeeWhere(query, attendanceDate),
        accessibleIds,
      );
      const summaryEmployeeWhere = scopeEmployeeWhere(
        this.summaryEmployeeWhere(query, attendanceDate),
        accessibleIds,
      );
      const take = query.limit ?? 24;

      const [
        allLogs,
        activeEmployees,
        employees,
        pendingRegularizations,
        alerts,
      ] = await Promise.all([
        tx.attendanceLog.findMany({
          where: { attendanceDate, employee: summaryEmployeeWhere },
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
          where: summaryEmployeeWhere,
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
        permissions.has(PERMISSIONS.REGULARIZATIONS_MANAGE)
          ? tx.regularizationRequest.count({
              where: {
                status: RequestStatus.PENDING,
                employeeId: accessibleIds ? { in: accessibleIds } : undefined,
              },
            })
          : Promise.resolve(null),
        permissions.has(PERMISSIONS.ATTENDANCE_SECURITY_ALERTS_READ)
          ? tx.securityAlert.groupBy({
              by: ['alertType'],
              where: {
                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
                employeeId: accessibleIds ? { in: accessibleIds } : undefined,
              },
              _count: { _all: true },
            })
          : Promise.resolve(null),
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
      const absenteeAlerts = alerts
        ? alertCount(alerts, SecurityAlertType.ABSENTEE)
        : null;
      const securityViolations = alerts
        ? alerts.reduce(
            (total, item) =>
              item.alertType === SecurityAlertType.ABSENTEE
                ? total
                : total + item._count._all,
            0,
          )
        : null;

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

  hrSummary(userId: string, permissions: Set<string>) {
    const tenantId = this.context.tenantId;
    if (!tenantId) throw new Error('Tenant context is required');
    return this.prisma.forTenant(async (tx) => {
      const accessibleIds = await this.accessibleEmployeeIds(tx, userId);
      const employeeScope: Prisma.EmployeeWhereInput = accessibleIds
        ? { id: { in: accessibleIds } }
        : {};
      const queueScope = accessibleIds
        ? { employeeId: { in: accessibleIds } }
        : {};
      const canReadWorkforce = hasAny(permissions, [
        PERMISSIONS.EMPLOYEES_READ,
        PERMISSIONS.EMPLOYEES_REPORTS_READ,
      ]);
      const canReadSetup = hasAny(permissions, [
        PERMISSIONS.SETTINGS_READ,
        PERMISSIONS.ATTENDANCE_CONFIG_READ,
        PERMISSIONS.ATTENDANCE_CONFIG_MANAGE,
      ]);
      const now = new Date();
      const inThirtyDays = new Date(now.getTime() + 30 * 86_400_000);

      const [
        workforce,
        pendingLeave,
        pendingDevices,
        openSecurityAlerts,
        pendingRegularizations,
        setup,
        access,
        subscription,
        modules,
        tenantQuotaUsed,
      ] = await Promise.all([
        canReadWorkforce
          ? Promise.all([
              tx.employee.count({
                where: { ...employeeScope, status: EmployeeStatus.ACTIVE },
              }),
              tx.employee.count({
                where: { ...employeeScope, status: EmployeeStatus.ON_NOTICE },
              }),
              tx.employee.count({
                where: { ...employeeScope, status: EmployeeStatus.TERMINATED },
              }),
              tx.employee.count({
                where: {
                  ...employeeScope,
                  status: { not: EmployeeStatus.TERMINATED },
                  managerId: null,
                },
              }),
              tx.employee.count({
                where: {
                  ...employeeScope,
                  status: EmployeeStatus.ACTIVE,
                  dateOfJoining: { gt: now, lte: inThirtyDays },
                },
              }),
            ])
          : Promise.resolve(null),
        hasAny(permissions, [
          PERMISSIONS.LEAVE_APPROVE,
          PERMISSIONS.LEAVE_MANAGE,
        ])
          ? tx.leaveRequest.count({
              where: { ...queueScope, status: RequestStatus.PENDING },
            })
          : Promise.resolve(null),
        permissions.has(PERMISSIONS.ATTENDANCE_DEVICES_READ)
          ? tx.registeredDevice.count({
              where: { ...queueScope, status: DeviceStatus.PENDING_APPROVAL },
            })
          : Promise.resolve(null),
        permissions.has(PERMISSIONS.ATTENDANCE_SECURITY_ALERTS_READ)
          ? tx.securityAlert.count({
              where: {
                ...queueScope,
                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
              },
            })
          : Promise.resolve(null),
        permissions.has(PERMISSIONS.REGULARIZATIONS_MANAGE)
          ? tx.regularizationRequest.count({
              where: { ...queueScope, status: RequestStatus.PENDING },
            })
          : Promise.resolve(null),
        canReadSetup
          ? Promise.all([
              tx.tenant.findUnique({
                where: { id: tenantId },
                select: { onboardingCompletedAt: true },
              }),
              tx.department.count({ where: { tenantId } }),
              tx.officeLocation.count({ where: { tenantId } }),
              tx.attendancePolicy.count({ where: { tenantId } }),
              tx.policyAssignment.count({ where: { tenantId } }),
              tx.shift.count({ where: { tenantId } }),
            ])
          : Promise.resolve(null),
        permissions.has(PERMISSIONS.USERS_READ)
          ? Promise.all([
              tx.user.count({ where: { tenantId, status: UserStatus.ACTIVE } }),
              tx.user.count({
                where: { tenantId, status: { in: ['LOCKED', 'DISABLED'] } },
              }),
              tx.verificationToken.count({
                where: {
                  tenantId,
                  purpose: TokenPurpose.USER_INVITE,
                  consumedAt: null,
                  expiresAt: { gt: now },
                },
              }),
            ])
          : Promise.resolve(null),
        permissions.has(PERMISSIONS.BILLING_SUBSCRIPTION_READ)
          ? tx.tenantSubscription.findFirst({
              where: { tenantId, status: { in: ['TRIALING', 'ACTIVE'] } },
              include: { plan: { select: { maxEmployees: true } } },
              orderBy: { createdAt: 'desc' },
            })
          : Promise.resolve(null),
        permissions.has(PERMISSIONS.MODULES_READ)
          ? tx.tenantModule.findMany({
              where: { tenantId, isActive: true },
              select: { module: { select: { key: true, name: true } } },
              orderBy: { module: { name: 'asc' } },
            })
          : Promise.resolve(null),
        tx.employee.count({
          where: {
            tenantId,
            status: { in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_NOTICE] },
          },
        }),
      ]);

      return {
        data: {
          workforce: workforce
            ? {
                active: workforce[0],
                onNotice: workforce[1],
                terminated: workforce[2],
                missingManager: workforce[3],
                joiningSoon: workforce[4],
              }
            : null,
          queues: {
            pendingLeave,
            pendingDevices,
            openSecurityAlerts,
            pendingRegularizations,
          },
          setup: setup
            ? {
                onboardingComplete: Boolean(setup[0]?.onboardingCompletedAt),
                departments: setup[1],
                offices: setup[2],
                attendancePolicies: setup[3],
                policyAssignments: setup[4],
                shifts: setup[5],
              }
            : null,
          access: access
            ? {
                activeUsers: access[0],
                unavailableUsers: access[1],
                pendingInvitations: access[2],
              }
            : null,
          quota: subscription
            ? {
                used: tenantQuotaUsed,
                limit: subscription.plan.maxEmployees,
              }
            : null,
          modules: modules?.map(({ module }) => module) ?? null,
          generatedAt: new Date().toISOString(),
        },
      };
    });
  }

  private async accessibleEmployeeIds(
    tx: PrismaTransaction,
    userId: string,
  ): Promise<string[] | null> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        employee: { select: { id: true } },
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return [];
    const permissions = new Set(
      user.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.key),
      ),
    );
    if (permissions.has(PERMISSIONS.EMPLOYEES_READ)) return null;
    if (!user.employee) return [];
    if (permissions.has(PERMISSIONS.EMPLOYEES_REPORTS_READ)) {
      const employees = await tx.employee.findMany({
        select: { id: true, managerId: true },
      });
      return collectReportingEmployeeIds(user.employee.id, employees);
    }
    return [user.employee.id];
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
      ...(query.officeId
        ? {
            officeAssignments: {
              some: { officeLocationId: query.officeId },
            },
          }
        : {}),
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

  private summaryEmployeeWhere(
    query: AttendanceDashboardQueryDto,
    attendanceDate: Date,
  ): Prisma.EmployeeWhereInput {
    return {
      ...activeEmployeeWhere(attendanceDate),
      deptId: query.departmentId,
      ...(query.officeId
        ? {
            officeAssignments: {
              some: { officeLocationId: query.officeId },
            },
          }
        : {}),
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

function scopeEmployeeWhere(
  where: Prisma.EmployeeWhereInput,
  accessibleIds: string[] | null,
): Prisma.EmployeeWhereInput {
  return accessibleIds
    ? { AND: [where, { id: { in: accessibleIds } }] }
    : where;
}

function hasAny(permissions: Set<string>, required: readonly string[]) {
  return required.some((permission) => permissions.has(permission));
}

import { Injectable } from '@nestjs/common';
import { JobStatus, ReportType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { DateTime } from 'luxon';
import { PrismaService } from '../../../shared/database/prisma.service';
import { PrivateObjectStorageService } from '../../../shared/storage/private-object-storage.service';
import {
  calendarDisplayStatus,
  databaseDate,
  exceptionLeaveFractionForDate,
  isConfiguredWeeklyOff,
} from '../core/application/attendance-runtime.service';
import { createCsv } from './report-csv';

export type ReportTask = { tenantId: string; reportId: string };

@Injectable()
export class ReportingProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PrivateObjectStorageService,
  ) {}

  async process(task: ReportTask) {
    const report = await this.prisma.forAdmin((tx) =>
      tx.reportExport.findFirst({
        where: { id: task.reportId, tenantId: task.tenantId },
      }),
    );
    if (!report || report.status === JobStatus.COMPLETED) return report;

    await this.prisma.forAdmin((tx) =>
      tx.reportExport.update({
        where: { id: report.id },
        data: {
          status: JobStatus.RUNNING,
          failureCode: null,
          failureMessage: null,
        },
      }),
    );

    try {
      const generated = await this.generate(
        task.tenantId,
        report.reportType,
        report.filters,
      );
      const checksum = createHash('sha256')
        .update(generated.body)
        .digest('hex');
      const objectKey = await this.storage.putReport(
        task.tenantId,
        report.id,
        'csv',
        'text/csv; charset=utf-8',
        generated.body,
      );
      const completedAt = new Date();
      return await this.prisma.forAdmin((tx) =>
        tx.reportExport.update({
          where: { id: report.id },
          data: {
            status: JobStatus.COMPLETED,
            objectKey,
            checksum,
            sourceWatermark: generated.watermark,
            completedAt,
            expiresAt: new Date(completedAt.getTime() + 30 * 86_400_000),
          },
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Report generation failed';
      await this.prisma.forAdmin((tx) =>
        tx.reportExport.update({
          where: { id: report.id },
          data: {
            status: JobStatus.FAILED,
            failureCode: 'REPORT_GENERATION_FAILED',
            failureMessage: message.slice(0, 1000),
          },
        }),
      );
      throw error;
    }
  }

  private async generate(
    tenantId: string,
    type: ReportType,
    rawFilters: unknown,
  ) {
    const filters = rawFilters as ReportFilters;
    if (type === ReportType.MUSTER) return this.muster(tenantId, filters);
    if (type === ReportType.PAYROLL) return this.payroll(tenantId, filters);
    if (type === ReportType.LATE_OT) return this.lateOt(tenantId, filters);
    if (type === ReportType.VIOLATIONS)
      return this.violations(tenantId, filters);
    return this.fieldDistance(tenantId, filters);
  }

  private async muster(tenantId: string, filters: ReportFilters) {
    const { start, end } = reportRange(filters);
    const reportData = await this.prisma.forAdmin(async (tx) => {
      const [employees, settings] = await Promise.all([
        tx.employee.findMany({
          where: employeeWhere(tenantId, filters),
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            dateOfJoining: true,
            dateOfExit: true,
            deptId: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
            defaultShift: { select: { name: true } },
            officeAssignments: {
              where: { isPrimary: true },
              take: 1,
              select: {
                office: {
                  select: {
                    id: true,
                    officeName: true,
                    timezone: true,
                  },
                },
              },
            },
            attendanceDays: {
              where: { attendanceDate: { gte: start, lte: end } },
              orderBy: { attendanceDate: 'asc' },
            },
          },
          orderBy: { employeeCode: 'asc' },
        }),
        tx.tenantSettings.findUniqueOrThrow({
          where: { tenantId },
          select: { timezone: true, weeklyOffs: true, updatedAt: true },
        }),
      ]);
      const employeeIds = employees.map((employee) => employee.id);
      const departmentIds = [
        ...new Set(employees.map((employee) => employee.deptId)),
      ];
      const [assignments, holidays, exceptions, approvedLeaves, rosters] =
        await Promise.all([
          tx.policyAssignment.findMany({
            where: {
              tenantId,
              OR: [
                { scope: 'EMPLOYEE', employeeId: { in: employeeIds } },
                { scope: 'DEPARTMENT', deptId: { in: departmentIds } },
                { scope: 'TENANT_DEFAULT' },
              ],
            },
            select: {
              scope: true,
              employeeId: true,
              deptId: true,
              policy: { select: { weeklyOffs: true, updatedAt: true } },
            },
          }),
          tx.tenantHoliday.findMany({
            where: {
              tenantId,
              holidayDate: { gte: start, lte: end },
            },
          }),
          tx.attendanceException.findMany({
            where: {
              tenantId,
              employeeId: { in: employeeIds },
              startDate: { lte: end },
              endDate: { gte: start },
            },
            include: {
              leaveRequest: {
                select: {
                  status: true,
                  policy: { select: { name: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          tx.leaveRequest.findMany({
            where: {
              tenantId,
              employeeId: { in: employeeIds },
              status: 'APPROVED',
              startDate: { lte: end },
              endDate: { gte: start },
            },
            include: { policy: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          }),
          tx.employeeShiftRoster.findMany({
            where: {
              tenantId,
              employeeId: { in: employeeIds },
              rosterDate: { gte: start, lte: end },
            },
            include: { shift: { select: { name: true } } },
          }),
        ]);
      return {
        employees,
        settings,
        assignments,
        holidays,
        exceptions,
        approvedLeaves,
        rosters,
      };
    });

    const days = dateColumns(start, end);
    const rows = reportData.employees.flatMap((employee) => {
      const office = employee.officeAssignments[0]?.office;
      const timezone = office?.timezone ?? reportData.settings.timezone;
      const today = DateTime.now().setZone(timezone).toISODate()!;
      const assignment =
        reportData.assignments.find(
          (item) =>
            item.scope === 'EMPLOYEE' && item.employeeId === employee.id,
        ) ??
        reportData.assignments.find(
          (item) =>
            item.scope === 'DEPARTMENT' && item.deptId === employee.deptId,
        ) ??
        reportData.assignments.find((item) => item.scope === 'TENANT_DEFAULT');
      const weeklyOffs =
        assignment?.policy.weeklyOffs ?? reportData.settings.weeklyOffs;
      const logsByDate = new Map(
        employee.attendanceDays.map((log) => [
          databaseDate(log.attendanceDate),
          log,
        ]),
      );
      const holidaysByDate = new Map(
        reportData.holidays
          .filter(
            (holiday) =>
              holiday.officeLocationId === null ||
              holiday.officeLocationId === office?.id,
          )
          .map((holiday) => [databaseDate(holiday.holidayDate), holiday]),
      );
      const rostersByDate = new Map(
        reportData.rosters
          .filter((roster) => roster.employeeId === employee.id)
          .map((roster) => [databaseDate(roster.rosterDate), roster]),
      );
      const employeeExceptions = reportData.exceptions.filter(
        (item) => item.employeeId === employee.id,
      );
      const employeeLeaves = reportData.approvedLeaves.filter(
        (item) => item.employeeId === employee.id,
      );

      return days.map((date) => {
        const log = logsByDate.get(date);
        const holiday = holidaysByDate.get(date);
        const roster = rostersByDate.get(date);
        const exception = employeeExceptions.find(
          (item) =>
            databaseDate(item.startDate) <= date &&
            databaseDate(item.endDate) >= date,
        );
        const approvedLeave = employeeLeaves.find(
          (item) =>
            databaseDate(item.startDate) <= date &&
            databaseDate(item.endDate) >= date,
        );
        const leave =
          (exception?.exceptionType === 'LEAVE' &&
            (!exception.leaveRequest ||
              exception.leaveRequest.status === 'APPROVED')) ||
          !!approvedLeave;
        const leaveRange = exception ?? approvedLeave;
        const display = calendarDisplayStatus({
          log,
          holiday: !!holiday,
          weeklyOff:
            !roster && isConfiguredWeeklyOff(weeklyOffs, date, timezone),
          leave,
          halfDayLeave:
            leave && leaveRange
              ? exceptionLeaveFractionForDate(leaveRange, date) === 0.5
              : false,
          onDuty: exception?.exceptionType === 'ON_DUTY',
          notApplicable:
            date < databaseDate(employee.dateOfJoining) ||
            (employee.dateOfExit !== null &&
              date > databaseDate(employee.dateOfExit)),
          isToday: date === today,
          isFuture: date > today,
        });
        const label =
          holiday?.holidayName ??
          (leave
            ? (exception?.leaveRequest?.policy.name ??
              approvedLeave?.policy.name ??
              'Approved leave')
            : '');

        return [
          employee.employeeCode,
          employee.fullName,
          employee.department.name,
          employee.designation?.name,
          office?.officeName,
          date,
          attendanceStatusLabel(display.status),
          label,
          display.source,
          roster?.shift.name ?? employee.defaultShift?.name,
          timezone,
          localClock(log?.firstCheckin ?? null, timezone),
          localClock(log?.lastCheckout ?? null, timezone),
          duration(log?.totalWorkMinutes ?? 0),
          log?.totalWorkMinutes ?? 0,
          log?.breakMinutes ?? 0,
          log?.lateMinutes ?? 0,
          log?.earlyLeaveMinutes ?? 0,
          log?.overtimeMinutes ?? 0,
          log ? (log.finalizedAt ? 'Finalized' : 'Open') : 'Derived',
        ];
      });
    });

    return generated(
      createCsv(
        [
          'Employee code',
          'Employee name',
          'Department',
          'Designation',
          'Office',
          'Attendance date',
          'Status',
          'Day label',
          'Status source',
          'Shift',
          'Timezone',
          'Check-in',
          'Checkout',
          'Worked (HH:MM)',
          'Worked minutes',
          'Break minutes',
          'Late minutes',
          'Early leave minutes',
          'Overtime minutes',
          'Record state',
        ],
        rows,
      ),
      [
        reportData.settings.updatedAt,
        ...reportData.assignments.map((item) => item.policy.updatedAt),
        ...reportData.exceptions.map((item) => item.updatedAt),
        ...reportData.approvedLeaves.map((item) => item.updatedAt),
        ...reportData.employees.flatMap((employee) =>
          employee.attendanceDays.map((log) => log.updatedAt),
        ),
      ],
    );
  }

  private async payroll(tenantId: string, filters: ReportFilters) {
    const { start, end } = reportRange(filters);
    const employees = await this.prisma.forAdmin((tx) =>
      tx.employee.findMany({
        where: employeeWhere(tenantId, filters),
        select: {
          employeeCode: true,
          fullName: true,
          attendanceDays: {
            where: { attendanceDate: { gte: start, lte: end } },
          },
        },
        orderBy: { employeeCode: 'asc' },
      }),
    );
    const rows = employees.map((employee) => {
      const logs = employee.attendanceDays;
      const payableDays = logs.reduce(
        (total, log) => total + payableFraction(log.attendanceStatus),
        0,
      );
      const workMinutes = sum(logs, 'totalWorkMinutes');
      const overtime = sum(logs, 'overtimeMinutes');
      const late = sum(logs, 'lateMinutes');
      const lossOfPay = Math.max(
        0,
        dateColumns(start, end).length - payableDays,
      );
      return [
        employee.employeeCode,
        employee.fullName,
        filters.period,
        payableDays,
        workMinutes,
        overtime,
        late,
        lossOfPay,
      ];
    });
    return generated(
      createCsv(
        [
          'Employee code',
          'Employee name',
          'Period',
          'Payable days',
          'Payable minutes',
          'Overtime minutes',
          'Late minutes',
          'Loss of pay days',
        ],
        rows,
      ),
      employees.flatMap((employee) =>
        employee.attendanceDays.map((log) => log.updatedAt),
      ),
    );
  }

  private async lateOt(tenantId: string, filters: ReportFilters) {
    const { start, end } = reportRange(filters);
    const logs = await this.prisma.forAdmin((tx) =>
      tx.attendanceLog.findMany({
        where: {
          tenantId,
          attendanceDate: { gte: start, lte: end },
          employee: employeeWhere(tenantId, filters),
          OR: [{ lateMinutes: { gt: 0 } }, { overtimeMinutes: { gt: 0 } }],
        },
        include: {
          employee: { select: { employeeCode: true, fullName: true } },
        },
        orderBy: [
          { attendanceDate: 'asc' },
          { employee: { employeeCode: 'asc' } },
        ],
      }),
    );
    return generated(
      createCsv(
        [
          'Date',
          'Employee code',
          'Employee name',
          'Late minutes',
          'Overtime minutes',
          'Early leave minutes',
        ],
        logs.map((log) => [
          isoDay(log.attendanceDate),
          log.employee.employeeCode,
          log.employee.fullName,
          log.lateMinutes,
          log.overtimeMinutes,
          log.earlyLeaveMinutes,
        ]),
      ),
      logs.map((log) => log.updatedAt),
    );
  }

  private async violations(tenantId: string, filters: ReportFilters) {
    const { start, endExclusive } = reportRange(filters);
    const rows = await this.prisma.forAdmin((tx) =>
      tx.attendanceVerificationLog.findMany({
        where: {
          tenantId,
          employeeId: filters.employeeId,
          verifiedAt: { gte: start, lt: endExclusive },
          verificationStatus: { not: 'PASSED' },
        },
        orderBy: { verifiedAt: 'asc' },
      }),
    );
    const employees = await this.employeeLabels(
      tenantId,
      rows.map((row) => row.employeeId),
    );
    return generated(
      createCsv(
        [
          'Time',
          'Employee code',
          'Employee name',
          'Status',
          'Failure codes',
          'Distance from geofence (m)',
        ],
        rows.map((row) => [
          row.verifiedAt.toISOString(),
          employees.get(row.employeeId)?.employeeCode,
          employees.get(row.employeeId)?.fullName,
          row.verificationStatus,
          jsonList(row.failureReasons).join('|'),
          row.distanceFromGeofenceM,
        ]),
      ),
      rows.map((row) => row.verifiedAt),
    );
  }

  private async fieldDistance(tenantId: string, filters: ReportFilters) {
    const { start, end } = reportRange(filters);
    const rows = await this.prisma.forAdmin((tx) =>
      tx.fieldRouteSummary.findMany({
        where: {
          tenantId,
          employeeId: filters.employeeId,
          routeDate: { gte: start, lte: end },
        },
        orderBy: [{ routeDate: 'asc' }, { employeeId: 'asc' }],
      }),
    );
    const employees = await this.employeeLabels(
      tenantId,
      rows.map((row) => row.employeeId),
    );
    return generated(
      createCsv(
        [
          'Date',
          'Employee code',
          'Employee name',
          'Distance meters',
          'Duration seconds',
          'Ping count',
        ],
        rows.map((row) => {
          const durationSeconds =
            row.sourceStartedAt && row.sourceEndedAt
              ? Math.max(
                  0,
                  Math.round(
                    (row.sourceEndedAt.getTime() -
                      row.sourceStartedAt.getTime()) /
                      1000,
                  ),
                )
              : 0;
          return [
            isoDay(row.routeDate),
            employees.get(row.employeeId)?.employeeCode,
            employees.get(row.employeeId)?.fullName,
            row.distanceMeters,
            durationSeconds,
            row.pingCount,
          ];
        }),
      ),
      rows.map((row) => row.updatedAt),
    );
  }

  private async employeeLabels(tenantId: string, ids: string[]) {
    const employees = await this.prisma.forAdmin((tx) =>
      tx.employee.findMany({
        where: { tenantId, id: { in: [...new Set(ids)] } },
        select: { id: true, employeeCode: true, fullName: true },
      }),
    );
    return new Map(employees.map((employee) => [employee.id, employee]));
  }
}

type ReportFilters = {
  period?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  departmentId?: string;
};

function employeeWhere(tenantId: string, filters: ReportFilters) {
  return {
    tenantId,
    id: filters.employeeId,
    deptId: filters.departmentId,
    status: 'ACTIVE' as const,
  };
}

function reportRange(filters: ReportFilters) {
  if (filters.period) {
    const [year, month] = filters.period.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const endExclusive = new Date(Date.UTC(year, month, 1));
    return {
      start,
      end: new Date(endExclusive.getTime() - 86_400_000),
      endExclusive,
    };
  }
  const start = new Date(`${filters.startDate}T00:00:00.000Z`);
  const end = new Date(`${filters.endDate}T00:00:00.000Z`);
  return { start, end, endExclusive: new Date(end.getTime() + 86_400_000) };
}

function dateColumns(start: Date, end: Date) {
  const days: string[] = [];
  for (
    let cursor = start.getTime();
    cursor <= end.getTime();
    cursor += 86_400_000
  ) {
    days.push(isoDay(new Date(cursor)));
  }
  return days;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function attendanceStatusLabel(status: string) {
  return (
    (
      {
        PRESENT: 'Present',
        PRESENT_OPEN: 'Present - checkout pending',
        HALF_DAY: 'Half day',
        ON_LEAVE: 'On leave',
        HOLIDAY: 'Holiday',
        WEEKLY_OFF: 'Weekly off',
        ON_DUTY: 'On duty',
        ABSENT: 'Absent',
        LATE: 'Late',
        UPCOMING: 'Upcoming',
        WORKING_DAY: 'Working day',
        NOT_APPLICABLE: 'Not applicable',
      } as Record<string, string>
    )[status] ?? status.replaceAll('_', ' ')
  );
}

function localClock(value: Date | null, timezone: string) {
  return value
    ? DateTime.fromJSDate(value, { zone: 'utc' })
        .setZone(timezone)
        .toFormat('HH:mm:ss')
    : '';
}

function duration(minutes: number) {
  const safeMinutes = Math.max(0, minutes);
  return `${Math.floor(safeMinutes / 60)
    .toString()
    .padStart(2, '0')}:${(safeMinutes % 60).toString().padStart(2, '0')}`;
}

function payableFraction(status: string) {
  if (
    [
      'PRESENT',
      'PRESENT_OPEN',
      'ON_LEAVE',
      'HOLIDAY',
      'WEEKLY_OFF',
      'ON_DUTY',
    ].includes(status)
  )
    return 1;
  return status === 'HALF_DAY' ? 0.5 : 0;
}

function sum<T>(rows: T[], key: keyof T) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function generated(body: Buffer, timestamps: Date[]) {
  const latest = timestamps.reduce(
    (max, date) => Math.max(max, date.getTime()),
    0,
  );
  return { body, watermark: latest ? new Date(latest).toISOString() : 'empty' };
}

function jsonList(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

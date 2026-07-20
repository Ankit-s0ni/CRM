import { Injectable } from '@nestjs/common';
import { JobStatus, ReportType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../../shared/database/prisma.service';
import { PrivateObjectStorageService } from '../../../shared/storage/private-object-storage.service';
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
    const employees = await this.prisma.forAdmin((tx) =>
      tx.employee.findMany({
        where: employeeWhere(tenantId, filters),
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          department: { select: { name: true } },
          attendanceDays: {
            where: { attendanceDate: { gte: start, lte: end } },
            orderBy: { attendanceDate: 'asc' },
          },
        },
        orderBy: { employeeCode: 'asc' },
      }),
    );
    const days = dateColumns(start, end);
    const rows = employees.map((employee) => {
      const byDay = new Map(
        employee.attendanceDays.map((log) => [
          isoDay(log.attendanceDate),
          musterCode(log.attendanceStatus),
        ]),
      );
      const codes = days.map((day) => byDay.get(day) ?? 'A');
      return [
        employee.employeeCode,
        employee.fullName,
        employee.department.name,
        ...codes,
        codes.filter((code) => code === 'P').length,
        codes.filter((code) => code === 'L').length,
        codes.filter((code) => code === 'A').length,
      ];
    });
    return generated(
      createCsv(
        [
          'Employee code',
          'Employee name',
          'Department',
          ...days,
          'Present',
          'Leave',
          'Absent',
        ],
        rows,
      ),
      employees.flatMap((employee) =>
        employee.attendanceDays.map((log) => log.updatedAt),
      ),
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

function musterCode(status: string) {
  return (
    (
      {
        PRESENT: 'P',
        PRESENT_OPEN: 'P',
        HALF_DAY: 'HD',
        ON_LEAVE: 'L',
        HOLIDAY: 'H',
        WEEKLY_OFF: 'WO',
        ON_DUTY: 'OD',
        ABSENT: 'A',
      } as Record<string, string>
    )[status] ?? 'A'
  );
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

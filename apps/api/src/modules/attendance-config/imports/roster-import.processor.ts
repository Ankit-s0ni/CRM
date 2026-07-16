import { Injectable } from '@nestjs/common';
import { ImportRowStatus, JobStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { TenantJobContextRunner } from '../../../shared/tenancy/tenant-job-context.runner';
import { EmployeeImportStorageService } from '../../organization/imports/employee-import-storage.service';
import { normalizeRosterRow, parseRosterCsv } from './roster-import-parser';

export type RosterImportTask = { tenantId: string; importJobId: string };

@Injectable()
export class RosterImportProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: EmployeeImportStorageService,
    private readonly tenantJobs: TenantJobContextRunner,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  process(task: RosterImportTask) {
    return this.tenantJobs.run(task, () => this.processInTenant(task));
  }

  private async processInTenant(task: RosterImportTask) {
    const existingRows = await this.prisma.forTenant((tx) =>
      tx.rosterImportRow.count({ where: { importJobId: task.importJobId } }),
    );
    if (existingRows) return this.finish(task.importJobId);

    try {
      const job = await this.prisma.forTenant((tx) =>
        tx.importJob.update({
          where: { id: task.importJobId },
          data: {
            status: JobStatus.RUNNING,
            startedAt: new Date(),
            attemptCount: { increment: 1 },
            failureReason: null,
          },
        }),
      );
      if (!job.objectKey) throw new Error('IMPORT_OBJECT_KEY_MISSING');
      const rows = parseRosterCsv(await this.storage.getText(job.objectKey));
      const context = await this.prisma.forTenant(async (tx) => ({
        employees: await tx.employee.findMany({
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            employeeCode: true,
            officeAssignments: {
              where: { isPrimary: true },
              select: { officeLocationId: true },
            },
          },
        }),
        shifts: await tx.shift.findMany({ select: { id: true, name: true } }),
        holidays: await tx.tenantHoliday.findMany({
          select: { holidayDate: true, officeLocationId: true },
        }),
      }));
      const employees = new Map(
        context.employees.map((employee) => [
          employee.employeeCode.toLowerCase(),
          employee.id,
        ]),
      );
      const shifts = new Map(
        context.shifts.map((shift) => [shift.name.toLowerCase(), shift.id]),
      );
      const primaryOfficeByEmployee = new Map(
        context.employees.map((employee) => [
          employee.id,
          employee.officeAssignments[0]?.officeLocationId,
        ]),
      );
      const tenantHolidayDates = new Set(
        context.holidays
          .filter(({ officeLocationId }) => officeLocationId === null)
          .map(({ holidayDate }) => holidayDate.toISOString().slice(0, 10)),
      );
      const officeHolidayKeys = new Set(
        context.holidays
          .filter(({ officeLocationId }) => officeLocationId !== null)
          .map(
            ({ holidayDate, officeLocationId }) =>
              `${officeLocationId}:${holidayDate.toISOString().slice(0, 10)}`,
          ),
      );
      const seen = new Set<string>();

      await this.prisma.forTenant(async (tx) => {
        for (const [index, raw] of rows.entries()) {
          const rowNumber = index + 2;
          let normalized: ReturnType<typeof normalizeRosterRow> | undefined;
          let errorCode: string | undefined;
          try {
            normalized = normalizeRosterRow(raw);
            const duplicateKey = `${normalized.employeeCode.toLowerCase()}:${normalized.rosterDate}`;
            if (seen.has(duplicateKey)) throw new Error('ROSTER_DUPLICATE_ROW');
            seen.add(duplicateKey);
            if (!employees.has(normalized.employeeCode.toLowerCase()))
              throw new Error('ROSTER_EMPLOYEE_NOT_FOUND');
            if (!shifts.has(normalized.shiftName.toLowerCase()))
              throw new Error('ROSTER_SHIFT_NOT_FOUND');
            const employeeId = employees.get(
              normalized.employeeCode.toLowerCase(),
            );
            const primaryOffice = employeeId
              ? primaryOfficeByEmployee.get(employeeId)
              : undefined;
            if (
              tenantHolidayDates.has(normalized.rosterDate) ||
              (primaryOffice &&
                officeHolidayKeys.has(
                  `${primaryOffice}:${normalized.rosterDate}`,
                ))
            )
              throw new Error('ROSTER_HOLIDAY');
          } catch (error) {
            errorCode =
              error instanceof Error ? error.message : 'ROSTER_ROW_INVALID';
          }

          const employeeId = normalized
            ? employees.get(normalized.employeeCode.toLowerCase())
            : undefined;
          const shiftId = normalized
            ? shifts.get(normalized.shiftName.toLowerCase())
            : undefined;
          let rosterId: string | undefined;
          if (!errorCode && normalized && employeeId && shiftId) {
            const rosterDate = new Date(
              `${normalized.rosterDate}T00:00:00.000Z`,
            );
            const existing = await tx.employeeShiftRoster.findFirst({
              where: { employeeId, rosterDate },
            });
            if (existing && existing.shiftId !== shiftId)
              errorCode = 'ROSTER_CONFLICT';
            else if (existing) rosterId = existing.id;
            else
              rosterId = (
                await tx.employeeShiftRoster.create({
                  data: {
                    tenantId: task.tenantId,
                    employeeId,
                    shiftId,
                    rosterDate,
                  },
                })
              ).id;
          }

          await tx.rosterImportRow.create({
            data: {
              tenantId: task.tenantId,
              importJobId: task.importJobId,
              rowNumber,
              idempotencyKey: hash(
                `${task.tenantId}:${task.importJobId}:${rowNumber}`,
              ),
              rawData: raw,
              normalizedData: normalized
                ? (normalized as unknown as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              status: errorCode
                ? ImportRowStatus.ERROR
                : ImportRowStatus.IMPORTED,
              errorCode: errorCode ?? null,
              errorMessage: errorCode ? safeMessage(errorCode) : null,
              employeeId: employeeId ?? null,
              shiftId: shiftId ?? null,
              rosterId: rosterId ?? null,
              attemptCount: 1,
            },
          });
        }
        await tx.importJob.update({
          where: { id: task.importJobId },
          data: { totalRows: rows.length },
        });
      });
      return this.finish(task.importJobId);
    } catch (error) {
      await this.prisma.forTenant((tx) =>
        tx.importJob.updateMany({
          where: { id: task.importJobId },
          data: {
            status: JobStatus.FAILED,
            failureReason:
              error instanceof Error
                ? error.message.slice(0, 300)
                : 'Roster import failed',
            completedAt: new Date(),
          },
        }),
      );
      throw error;
    }
  }

  private async finish(importJobId: string) {
    return this.prisma.forTenant(async (tx) => {
      const [job, successRows, errorRows] = await Promise.all([
        tx.importJob.findUniqueOrThrow({ where: { id: importJobId } }),
        tx.rosterImportRow.count({
          where: { importJobId, status: ImportRowStatus.IMPORTED },
        }),
        tx.rosterImportRow.count({
          where: { importJobId, status: ImportRowStatus.ERROR },
        }),
      ]);
      const completed = await tx.importJob.update({
        where: { id: importJobId },
        data: {
          status: JobStatus.COMPLETED,
          successRows,
          errorRows,
          completedAt: new Date(),
        },
      });
      if (job.status !== JobStatus.COMPLETED) {
        await this.audit.append(tx, {
          tenantId: job.tenantId,
          actorUserId: job.requestedBy,
          action: 'attendance.rosters.imported',
          module: 'ATTENDANCE',
          entityType: 'ImportJob',
          entityId: importJobId,
          newValue: { successRows, errorRows },
        });
        await this.outbox.append(tx, {
          tenantId: job.tenantId,
          eventKey: 'attendance.rosters.imported',
          payload: {
            tenantId: job.tenantId,
            importJobId,
            successRows,
            errorRows,
          },
        });
      }
      return completed;
    });
  }
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
function safeMessage(code: string) {
  const messages: Record<string, string> = {
    ROSTER_ROW_MALFORMED:
      'Employee code, shift name, and a valid date are required',
    ROSTER_DATE_INVALID: 'Roster date is invalid',
    ROSTER_DUPLICATE_ROW: 'Employee and date are duplicated in this file',
    ROSTER_EMPLOYEE_NOT_FOUND: 'Employee code was not found',
    ROSTER_SHIFT_NOT_FOUND: 'Shift name was not found',
    ROSTER_CONFLICT: 'Employee already has another shift for this date',
    ROSTER_HOLIDAY: 'Roster assignment was skipped because this is a holiday',
  };
  return messages[code] ?? 'Roster row is invalid';
}

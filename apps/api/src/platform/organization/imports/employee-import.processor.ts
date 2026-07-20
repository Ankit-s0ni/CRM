import { Injectable } from '@nestjs/common';
import {
  EmploymentEventType,
  ImportRowStatus,
  JobStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantJobContextRunner } from '../../tenancy/public';
import { EmployeeQuotaService } from '../employee-quota.service';
import { parseDateOnly } from '../employee-rules';
import {
  EmployeeImportRawRow,
  NormalizedEmployeeImportRow,
  normalizeEmployeeImportRow,
  parseEmployeeCsv,
} from './employee-import-parser';
import { EmployeeImportStorageService } from './employee-import-storage.service';
import { synchronizeSubscriptionSeats } from '../../billing/public';
import { provisionEmployeeLeaveBalances } from '../../../shared/leave/provision-leave-balances';

type ImportTask = { tenantId: string; importJobId: string };
type PreparedRow = {
  rowNumber: number;
  raw: EmployeeImportRawRow;
  normalized: NormalizedEmployeeImportRow;
};
type SafeRowError = { rowNumber: number; code: string; message: string };

@Injectable()
export class EmployeeImportProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: EmployeeImportStorageService,
    private readonly quotaService: EmployeeQuotaService,
    private readonly tenantJobContext: TenantJobContextRunner,
  ) {}

  process(task: ImportTask) {
    return this.tenantJobContext.run(task, () => this.processInTenant(task));
  }

  private async processInTenant(task: ImportTask) {
    try {
      const job = await this.prisma.forTenant((tx) =>
        tx.importJob.update({
          where: { id: task.importJobId },
          data: {
            status: JobStatus.RUNNING,
            startedAt: new Date(),
            completedAt: null,
            failureReason: null,
            attemptCount: { increment: 1 },
          },
        }),
      );
      if (!job.objectKey) throw new Error('IMPORT_OBJECT_KEY_MISSING');

      const existingRowCount = await this.prisma.forTenant((tx) =>
        tx.employeeImportRow.count({ where: { importJobId: job.id } }),
      );
      if (existingRowCount === 0) {
        const content = await this.storage.getText(job.objectKey);
        const rows = parseEmployeeCsv(content);
        await this.validateAndStoreRows(job.id, task.tenantId, rows);
      }

      await this.importValidatedRows(job.id, task.tenantId, job.requestedBy);
      return await this.finishJob(job.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Import processing failed';
      await this.prisma.forTenant((tx) =>
        tx.importJob.updateMany({
          where: { id: task.importJobId },
          data: {
            status: JobStatus.FAILED,
            failureReason: message.slice(0, 300),
            completedAt: new Date(),
          },
        }),
      );
      throw error;
    }
  }

  private async validateAndStoreRows(
    importJobId: string,
    tenantId: string,
    rows: EmployeeImportRawRow[],
  ) {
    const context = await this.prisma.forTenant(async (tx) => ({
      departments: await tx.department.findMany(),
      designations: await tx.designation.findMany(),
      employees: await tx.employee.findMany({
        select: { id: true, employeeCode: true, phone: true, managerId: true },
      }),
    }));
    const departments = new Map(
      context.departments.map((item) => [item.name.toLowerCase(), item.id]),
    );
    const designations = new Map(
      context.designations.map((item) => [item.name.toLowerCase(), item.id]),
    );
    const existingCodes = new Set(
      context.employees.map(({ employeeCode }) => employeeCode.toLowerCase()),
    );
    const existingPhones = new Set(
      context.employees.flatMap(({ phone }) => (phone ? [phone] : [])),
    );
    const seenCodes = new Set<string>();
    const seenPhones = new Set<string>();
    const prepared: PreparedRow[] = [];
    const errors = new Map<number, SafeRowError>();

    rows.forEach((raw, index) => {
      const rowNumber = index + 2;
      try {
        const normalized = normalizeEmployeeImportRow(raw);
        const codeKey = normalized.employeeCode.toLowerCase();
        if (seenCodes.has(codeKey)) throw new Error('DUPLICATE_CODE_IN_FILE');
        if (existingCodes.has(codeKey)) throw new Error('EMPLOYEE_CODE_TAKEN');
        if (
          normalized.phone &&
          (seenPhones.has(normalized.phone) ||
            existingPhones.has(normalized.phone))
        ) {
          throw new Error('EMPLOYEE_PHONE_TAKEN');
        }
        if (!departments.has(normalized.department.toLowerCase())) {
          throw new Error('DEPARTMENT_NOT_FOUND');
        }
        if (
          normalized.designation &&
          !designations.has(normalized.designation.toLowerCase())
        ) {
          throw new Error('DESIGNATION_NOT_FOUND');
        }
        seenCodes.add(codeKey);
        if (normalized.phone) seenPhones.add(normalized.phone);
        prepared.push({ rowNumber, raw, normalized });
      } catch (error) {
        const code = this.safeErrorCode(error);
        errors.set(rowNumber, {
          rowNumber,
          code,
          message: this.errorMessage(code),
        });
      }
    });

    const fileCodes = new Set(
      prepared.map(({ normalized }) => normalized.employeeCode.toLowerCase()),
    );
    for (const row of prepared) {
      const managerCode = row.normalized.managerEmployeeCode?.toLowerCase();
      if (!managerCode) continue;
      if (managerCode === row.normalized.employeeCode.toLowerCase()) {
        errors.set(row.rowNumber, this.error(row.rowNumber, 'MANAGER_CYCLE'));
      } else if (
        !fileCodes.has(managerCode) &&
        !existingCodes.has(managerCode)
      ) {
        errors.set(
          row.rowNumber,
          this.error(row.rowNumber, 'MANAGER_NOT_FOUND'),
        );
      }
    }
    this.detectFileManagerCycles(prepared, errors);

    await this.prisma.forTenant(async (tx) => {
      for (const row of rows.map((raw, index) => ({
        raw,
        rowNumber: index + 2,
      }))) {
        const valid = prepared.find(
          ({ rowNumber }) => rowNumber === row.rowNumber,
        );
        const rowError = errors.get(row.rowNumber);
        await tx.employeeImportRow.create({
          data: {
            tenantId,
            importJobId,
            rowNumber: row.rowNumber,
            idempotencyKey: this.idempotencyKey(
              tenantId,
              importJobId,
              valid?.normalized.employeeCode ?? `row-${row.rowNumber}`,
            ),
            employeeCode: valid?.normalized.employeeCode ?? null,
            rawData: row.raw,
            normalizedData: valid
              ? (valid.normalized as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            status: rowError
              ? ImportRowStatus.ERROR
              : ImportRowStatus.VALIDATED,
            errorCode: rowError?.code ?? null,
            errorMessage: rowError?.message ?? null,
            isRetryable: false,
          },
        });
      }
      await tx.importJob.update({
        where: { id: importJobId },
        data: { totalRows: rows.length },
      });
    });
  }

  private async importValidatedRows(
    importJobId: string,
    tenantId: string,
    requestedBy: string,
  ) {
    const rows = await this.prisma.forTenant((tx) =>
      tx.employeeImportRow.findMany({
        where: { importJobId, status: ImportRowStatus.VALIDATED },
        orderBy: { rowNumber: 'asc' },
      }),
    );
    const ordered = this.orderManagersFirst(rows);

    for (let offset = 0; offset < ordered.length; offset += 50) {
      const batch = ordered.slice(offset, offset + 50);
      try {
        await this.prisma.forTenant(async (tx) => {
          const quota = await this.quotaService.lockAndAssertCapacity(
            tx,
            tenantId,
            batch.length,
          );
          for (const [index, row] of batch.entries()) {
            const value =
              row.normalizedData as unknown as NormalizedEmployeeImportRow;
            const department = await tx.department.findFirst({
              where: {
                name: { equals: value.department, mode: 'insensitive' },
              },
            });
            const designation = value.designation
              ? await tx.designation.findFirst({
                  where: {
                    name: { equals: value.designation, mode: 'insensitive' },
                  },
                })
              : null;
            const manager = value.managerEmployeeCode
              ? await tx.employee.findFirst({
                  where: {
                    employeeCode: {
                      equals: value.managerEmployeeCode,
                      mode: 'insensitive',
                    },
                  },
                })
              : null;
            if (!department || (value.managerEmployeeCode && !manager)) {
              throw new Error('IMPORT_RELATIONSHIP_CHANGED');
            }
            const employee = await tx.employee.create({
              data: {
                tenantId,
                employeeCode: value.employeeCode,
                fullName: value.fullName,
                phone: value.phone,
                workType: value.workType,
                dateOfJoining: parseDateOnly(value.dateOfJoining),
                deptId: department.id,
                designationId: designation?.id ?? null,
                managerId: manager?.id ?? null,
              },
            });
            await tx.employmentEvent.create({
              data: {
                tenantId,
                employeeId: employee.id,
                eventType: EmploymentEventType.JOINED,
                effectiveDate: employee.dateOfJoining,
                createdBy: requestedBy,
                payload: { source: 'CSV_IMPORT', importJobId },
              },
            });
            await provisionEmployeeLeaveBalances(
              tx,
              tenantId,
              employee.id,
              requestedBy,
            );
            await tx.employeeImportRow.update({
              where: { id: row.id },
              data: {
                status: ImportRowStatus.IMPORTED,
                employeeId: employee.id,
                attemptCount: { increment: 1 },
              },
            });
            await this.quotaService.emitThresholdEvents(tx, tenantId, {
              ...quota,
              used: quota.used + index,
            });
          }
          await synchronizeSubscriptionSeats(
            tx,
            tenantId,
            `employee-import:${importJobId}:batch:${offset}`,
            requestedBy,
          );
        });
      } catch (error) {
        const code = this.safeErrorCode(error);
        await this.prisma.forTenant((tx) =>
          tx.employeeImportRow.updateMany({
            where: { id: { in: batch.map(({ id }) => id) } },
            data: {
              status: ImportRowStatus.ERROR,
              errorCode: code,
              errorMessage: this.errorMessage(code),
              isRetryable: code !== 'EMPLOYEE_QUOTA_REACHED',
              attemptCount: { increment: 1 },
            },
          }),
        );
      }
    }
  }

  private async finishJob(importJobId: string) {
    return this.prisma.forTenant(async (tx) => {
      const successRows = await tx.employeeImportRow.count({
        where: { importJobId, status: ImportRowStatus.IMPORTED },
      });
      const errors = await tx.employeeImportRow.findMany({
        where: { importJobId, status: ImportRowStatus.ERROR },
        select: { rowNumber: true, errorCode: true, errorMessage: true },
        orderBy: { rowNumber: 'asc' },
      });
      return tx.importJob.update({
        where: { id: importJobId },
        data: {
          status: JobStatus.COMPLETED,
          successRows,
          errorRows: errors.length,
          rowErrors: errors,
          completedAt: new Date(),
          failureReason: null,
        },
      });
    });
  }

  private orderManagersFirst<
    T extends { employeeCode: string | null; normalizedData: Prisma.JsonValue },
  >(rows: T[]) {
    const byCode = new Map(
      rows.map((row) => [row.employeeCode?.toLowerCase(), row]),
    );
    const result: T[] = [];
    const added = new Set<T>();
    const visit = (row: T) => {
      if (added.has(row)) return;
      const value =
        row.normalizedData as unknown as NormalizedEmployeeImportRow;
      const manager = value.managerEmployeeCode
        ? byCode.get(value.managerEmployeeCode.toLowerCase())
        : undefined;
      if (manager) visit(manager);
      added.add(row);
      result.push(row);
    };
    rows.forEach(visit);
    return result;
  }

  private detectFileManagerCycles(
    rows: PreparedRow[],
    errors: Map<number, SafeRowError>,
  ) {
    const byCode = new Map(
      rows.map((row) => [row.normalized.employeeCode.toLowerCase(), row]),
    );
    for (const row of rows) {
      const visited = new Set<string>();
      let current: PreparedRow | undefined = row;
      while (current?.normalized.managerEmployeeCode) {
        const code = current.normalized.employeeCode.toLowerCase();
        if (visited.has(code)) {
          for (const cycleCode of visited) {
            const cycleRow = byCode.get(cycleCode);
            if (cycleRow)
              errors.set(
                cycleRow.rowNumber,
                this.error(cycleRow.rowNumber, 'MANAGER_CYCLE'),
              );
          }
          break;
        }
        visited.add(code);
        current = byCode.get(
          current.normalized.managerEmployeeCode.toLowerCase(),
        );
      }
    }
  }

  private idempotencyKey(tenantId: string, jobId: string, code: string) {
    return createHash('sha256')
      .update(`${tenantId}:${jobId}:${code.toLowerCase()}`)
      .digest('hex');
  }

  private safeErrorCode(error: unknown) {
    if (error && typeof error === 'object' && 'getResponse' in error) {
      const response = (error as { getResponse(): unknown }).getResponse();
      if (response && typeof response === 'object' && 'code' in response) {
        return String(response.code);
      }
    }
    const message = error instanceof Error ? error.message : '';
    return /^[A-Z0-9_]+$/.test(message) ? message : 'IMPORT_ROW_FAILED';
  }

  private error(rowNumber: number, code: string): SafeRowError {
    return { rowNumber, code, message: this.errorMessage(code) };
  }

  private errorMessage(code: string) {
    const messages: Record<string, string> = {
      DUPLICATE_CODE_IN_FILE: 'Employee code is duplicated in this file',
      EMPLOYEE_CODE_TAKEN: 'Employee code already exists',
      EMPLOYEE_PHONE_TAKEN: 'Employee phone number already exists',
      DEPARTMENT_NOT_FOUND: 'Department was not found',
      DESIGNATION_NOT_FOUND: 'Designation was not found',
      MANAGER_NOT_FOUND: 'Manager employee code was not found',
      MANAGER_CYCLE: 'Manager assignment creates a reporting cycle',
      INVALID_EMPLOYMENT_DATES: 'Date of joining is invalid',
      EMPLOYEE_QUOTA_REACHED: 'Employee quota was reached',
      IMPORT_RELATIONSHIP_CHANGED:
        'Referenced organization data changed during import',
    };
    return messages[code] ?? 'Row could not be imported';
  }
}

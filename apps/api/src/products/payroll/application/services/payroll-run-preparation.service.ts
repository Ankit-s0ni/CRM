import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PayrollInputKind, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { parseDateOnly } from '../../domain/value-objects/effective-date-range';
import {
  AcknowledgePayrollValidationIssueDto,
  CreatePayrollRunDto,
  CreatePayrollRunInputDto,
  ImportPayrollAttendanceSnapshotDto,
  PreviewPayrollInputCsvDto,
} from '../dto/payroll-run-preparation.dto';

type Actor = { tenantId: string; userId: string };

@Injectable()
export class PayrollRunPreparationService {
  private readonly logger = new Logger(PayrollRunPreparationService.name);

  constructor(private readonly prisma: PrismaService) {}

  listRuns(tenantId: string) {
    return this.prisma.forTenant(async (tx) =>
      serializeBigInt({
        data: await tx.payrollRun.findMany({
          where: { tenantId },
          include: { payGroup: true, blockers: true },
          orderBy: { createdAt: 'desc' },
        }),
      }),
    );
  }

  getRun(tenantId: string, id: string) {
    return this.prisma.forTenant(async (tx) => {
      const run = await tx.payrollRun.findFirst({
        where: { tenantId, id },
        include: {
          payGroup: true,
          employees: true,
          inputs: true,
          blockers: true,
          inputImports: { orderBy: { createdAt: 'desc' } },
          validationRuns: { orderBy: { createdAt: 'desc' }, take: 5 },
          validationIssues: {
            where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
            orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
          },
          timeline: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!run) notFound('PAYROLL_RUN_NOT_FOUND', 'Payroll run');
      return { data: serializeBigInt(run) };
    });
  }

  createRun(actor: Actor, dto: CreatePayrollRunDto) {
    return this.prisma.forTenant(async (tx) => {
      if (dto.idempotencyKey) {
        const existing = await tx.payrollRun.findFirst({
          where: {
            tenantId: actor.tenantId,
            idempotencyKey: dto.idempotencyKey,
          },
        });
        if (existing) return { data: serializeBigInt(existing) };
      }
      const payGroup = await tx.payGroup.findFirst({
        where: { tenantId: actor.tenantId, id: dto.payGroupId },
      });
      if (!payGroup) notFound('PAY_GROUP_NOT_FOUND', 'Pay group');
      const duplicate = await tx.payrollRun.findFirst({
        where: {
          tenantId: actor.tenantId,
          payGroupId: dto.payGroupId,
          periodKey: dto.periodKey,
        },
      });
      if (duplicate) duplicateRun();
      try {
        const run = await tx.payrollRun.create({
          data: {
            tenantId: actor.tenantId,
            payGroupId: dto.payGroupId,
            periodKey: dto.periodKey,
            periodStart: parseDateOnly(dto.periodStart),
            periodEnd: parseDateOnly(dto.periodEnd),
            idempotencyKey: dto.idempotencyKey,
            createdBy: actor.userId,
          },
        });
        await timeline(tx, actor, run.id, 'payroll.run.created', {
          periodKey: run.periodKey,
          payGroupId: run.payGroupId,
        });
        return { data: serializeBigInt(run) };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError
        ) {
          if (error.code === 'P2002') duplicateRun();
          if (error.code === 'P2003') {
            throw new NotFoundException({
              code: 'PAY_GROUP_NOT_FOUND',
              message: 'The selected pay group does not exist.',
            });
          }
        }
        this.logger.error(
          `Failed to create payroll run for payGroup=${dto.payGroupId} period=${dto.periodKey}`,
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    });
  }

  importAttendanceSnapshot(
    actor: Actor,
    runId: string,
    dto: ImportPayrollAttendanceSnapshotDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const run = await this.requireDraftRun(tx, actor.tenantId, runId);
      await tx.payrollRunEmployee.deleteMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
      });
      for (const row of dto.rows) {
        const profile = await tx.employeePayrollProfile.findFirst({
          where: { tenantId: actor.tenantId, employeeId: row.employeeId },
        });
        await tx.payrollRunEmployee.create({
          data: {
            tenantId: actor.tenantId,
            payrollRunId: run.id,
            employeeId: row.employeeId,
            employeePayrollProfileId: profile?.id,
            attendanceSnapshot: json(row.snapshot ?? {}),
            payableDays: row.payableDays,
            lossOfPayDays: row.lossOfPayDays ?? 0,
            overtimeMinutes: row.overtimeMinutes ?? 0,
          },
        });
      }
      const updated = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          attendanceSource: dto.source,
          attendanceChecksum: dto.checksum,
          attendanceVersion: dto.sourceVersion,
          inputVersion: { increment: 1 },
          readiness: json({ ready: false, staleReason: 'attendance_changed' }),
          updatedBy: actor.userId,
        },
      });
      await timeline(
        tx,
        actor,
        run.id,
        'payroll.attendance_snapshot.imported',
        {
          source: dto.source,
          sourceVersion: dto.sourceVersion,
          rowCount: dto.rows.length,
        },
      );
      return { data: serializeBigInt(updated) };
    });
  }

  addInput(actor: Actor, runId: string, dto: CreatePayrollRunInputDto) {
    return this.prisma.forTenant(async (tx) => {
      const run = await this.requireDraftRun(tx, actor.tenantId, runId);
      if (dto.idempotencyKey) {
        const existing = await tx.payrollRunInput.findFirst({
          where: {
            tenantId: actor.tenantId,
            payrollRunId: run.id,
            idempotencyKey: dto.idempotencyKey,
          },
        });
        if (existing) return { data: serializeBigInt(existing) };
      }
      const input = await tx.payrollRunInput.create({
        data: {
          tenantId: actor.tenantId,
          payrollRunId: run.id,
          employeeId: dto.employeeId,
          kind: dto.kind,
          code: dto.code,
          amountMinor: dto.amountMinor ? BigInt(dto.amountMinor) : undefined,
          currency: dto.currency,
          payload: json(dto.payload ?? {}),
          idempotencyKey: dto.idempotencyKey,
          createdBy: actor.userId,
        },
      });
      await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          inputVersion: { increment: 1 },
          readiness: json({ ready: false, staleReason: 'input_changed' }),
          updatedBy: actor.userId,
        },
      });
      await timeline(tx, actor, run.id, 'payroll.input.added', {
        kind: input.kind,
        code: input.code,
        employeeId: input.employeeId,
      });
      return { data: serializeBigInt(input) };
    });
  }

  previewInputCsv(actor: Actor, runId: string, dto: PreviewPayrollInputCsvDto) {
    return this.prisma.forTenant(async (tx) => {
      const run = await this.requireDraftRun(tx, actor.tenantId, runId);
      const importChecksum = computeChecksum(`${dto.fileName}\n${dto.csvText}`);
      const existing = await tx.payrollInputImport.findFirst({
        where: {
          tenantId: actor.tenantId,
          payrollRunId: run.id,
          checksum: importChecksum,
        },
      });
      if (existing) return { data: existing };
      const parsed = parseInputCsv(dto.csvText);
      const previewRows = parsed.rows.map((row, index) => ({
        rowNumber: index + 2,
        ...row,
      }));
      const importJob = await tx.payrollInputImport.create({
        data: {
          tenantId: actor.tenantId,
          payrollRunId: run.id,
          fileName: dto.fileName,
          checksum: importChecksum,
          rowCount: parsed.rowCount,
          validRowCount: previewRows.length,
          errorCount: parsed.errors.length,
          previewRows: json(previewRows),
          errors: json(parsed.errors),
          createdBy: actor.userId,
        },
      });
      await timeline(tx, actor, run.id, 'payroll.input_import.previewed', {
        importId: importJob.id,
        rowCount: importJob.rowCount,
        errorCount: importJob.errorCount,
      });
      return { data: importJob };
    });
  }

  commitInputImport(actor: Actor, runId: string, importId: string) {
    return this.prisma.forTenant(async (tx) => {
      const run = await this.requireDraftRun(tx, actor.tenantId, runId);
      const importJob = await tx.payrollInputImport.findFirst({
        where: { tenantId: actor.tenantId, payrollRunId: run.id, id: importId },
      });
      if (!importJob)
        notFound('PAYROLL_INPUT_IMPORT_NOT_FOUND', 'Input import');
      if (importJob.status === 'COMMITTED') return { data: importJob };
      if (importJob.errorCount > 0) {
        throw new ConflictException({
          code: 'PAYROLL_INPUT_IMPORT_HAS_ERRORS',
          message: 'Fix CSV row errors before committing the import.',
        });
      }
      const rows = asRecordArray(importJob.previewRows);
      await tx.payrollRunInput.createMany({
        data: rows.map((row) => {
          const rowNumber = scalarString(row.rowNumber);
          return {
            tenantId: actor.tenantId,
            payrollRunId: run.id,
            employeeId: stringValue(row.employeeId) || undefined,
            kind: stringValue(row.kind) as PayrollInputKind,
            code: stringValue(row.code),
            amountMinor: BigInt(stringValue(row.amountMinor)),
            currency: stringValue(row.currency) || undefined,
            payload: json({
              reason: stringValue(row.reason),
              rowNumber,
            }),
            importId: importJob.id,
            source: 'csv-import',
            idempotencyKey: `${importJob.id}:${rowNumber}`,
            createdBy: actor.userId,
          };
        }),
        skipDuplicates: true,
      });
      const updatedImport = await tx.payrollInputImport.update({
        where: { id: importJob.id },
        data: { status: 'COMMITTED', committedAt: new Date() },
      });
      await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          inputVersion: { increment: 1 },
          readiness: json({
            ready: false,
            staleReason: 'input_import_committed',
          }),
          updatedBy: actor.userId,
        },
      });
      await timeline(tx, actor, run.id, 'payroll.input_import.committed', {
        importId: importJob.id,
        rowCount: rows.length,
      });
      return { data: updatedImport };
    });
  }

  validateRun(actor: Actor, runId: string) {
    return this.prisma.forTenant(async (tx) => {
      const run = await this.requireDraftRun(tx, actor.tenantId, runId);
      await tx.payrollRunBlocker.deleteMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
      });
      const employees = await tx.payrollRunEmployee.findMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
      });
      const blockers: Array<{
        employeeId?: string;
        severity: 'BLOCKER' | 'WARNING' | 'INFO';
        code: string;
        message: string;
        context?: Record<string, unknown>;
      }> = [];
      if (!run.attendanceChecksum) {
        blockers.push({
          severity: 'BLOCKER',
          code: 'ATTENDANCE_SNAPSHOT_MISSING',
          message: 'Import a locked attendance snapshot before calculation.',
        });
      }
      for (const employee of employees) {
        if (!employee.employeePayrollProfileId) {
          blockers.push({
            employeeId: employee.employeeId,
            severity: 'BLOCKER',
            code: 'PAYROLL_PROFILE_MISSING',
            message: 'Employee is missing a Payroll profile for this run.',
          });
          continue;
        }
        const compensation = await tx.employeeCompensationVersion.findFirst({
          where: {
            tenantId: actor.tenantId,
            employeePayrollProfileId: employee.employeePayrollProfileId,
            effectiveFrom: { lte: run.periodEnd },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: run.periodStart } },
            ],
          },
        });
        if (!compensation) {
          blockers.push({
            employeeId: employee.employeeId,
            severity: 'BLOCKER',
            code: 'COMPENSATION_VERSION_MISSING',
            message: 'Employee has no effective compensation for this period.',
          });
        }
        const paymentDetail = await tx.employeePaymentDetail.findFirst({
          where: {
            tenantId: actor.tenantId,
            employeePayrollProfileId: employee.employeePayrollProfileId,
            status: 'ACTIVE',
          },
        });
        if (!paymentDetail) {
          blockers.push({
            employeeId: employee.employeeId,
            severity: 'WARNING',
            code: 'PAYMENT_DETAIL_MISSING',
            message:
              'Employee has no active payment detail for payment export.',
          });
        }
      }
      if (!employees.length) {
        blockers.push({
          severity: 'BLOCKER',
          code: 'RUN_EMPLOYEES_MISSING',
          message: 'The run has no employee attendance snapshot rows.',
        });
      }
      if (
        employees.length &&
        !blockers.some((item) => item.severity === 'BLOCKER')
      ) {
        blockers.push({
          severity: 'INFO',
          code: 'RUN_READY_FOR_CALCULATION',
          message: 'Payroll run inputs are ready for calculation.',
        });
      }
      await tx.payrollValidationIssue.updateMany({
        where: {
          tenantId: actor.tenantId,
          payrollRunId: run.id,
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
        data: { status: 'OBSOLETE', resolvedAt: new Date() },
      });
      const readiness = {
        ready: !blockers.some((item) => item.severity === 'BLOCKER'),
        status: blockers.some((item) => item.severity === 'BLOCKER')
          ? 'VALIDATING'
          : 'INPUTS_READY',
        inputVersion: run.inputVersion,
        attendanceChecksum: run.attendanceChecksum,
        blockerCount: blockers.filter((item) => item.severity === 'BLOCKER')
          .length,
        warningCount: blockers.filter((item) => item.severity === 'WARNING')
          .length,
        infoCount: blockers.filter((item) => item.severity === 'INFO').length,
        codes: blockers.map((item) => item.code),
        validatedAt: new Date().toISOString(),
      };
      const validationRun = await tx.payrollValidationRun.create({
        data: {
          tenantId: actor.tenantId,
          payrollRunId: run.id,
          inputVersion: run.inputVersion,
          attendanceChecksum: run.attendanceChecksum,
          blockerCount: readiness.blockerCount,
          warningCount: readiness.warningCount,
          infoCount: readiness.infoCount,
          readiness: json(readiness),
          createdBy: actor.userId,
        },
      });
      await tx.payrollRunBlocker.createMany({
        data: blockers.map((blocker) => ({
          tenantId: actor.tenantId,
          payrollRunId: run.id,
          employeeId: blocker.employeeId,
          severity: blocker.severity,
          code: blocker.code,
          message: blocker.message,
        })),
      });
      await tx.payrollValidationIssue.createMany({
        data: blockers.map((blocker) => ({
          tenantId: actor.tenantId,
          payrollRunId: run.id,
          validationRunId: validationRun.id,
          employeeId: blocker.employeeId,
          severity: blocker.severity,
          code: blocker.code,
          message: blocker.message,
          context: json(blocker.context ?? {}),
        })),
      });
      const nextStatus = blockers.some((item) => item.severity === 'BLOCKER')
        ? 'VALIDATING'
        : 'INPUTS_READY';
      const updated = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: nextStatus,
          lastValidatedAt: new Date(),
          readiness: json(readiness),
          updatedBy: actor.userId,
        },
        include: { blockers: true, validationIssues: true },
      });
      await timeline(tx, actor, run.id, 'payroll.run.validated', {
        status: nextStatus,
        blockerCount: blockers.length,
      });
      return { data: serializeBigInt(updated) };
    });
  }

  readiness(tenantId: string, runId: string) {
    return this.prisma.forTenant(async (tx) => {
      const run = await tx.payrollRun.findFirst({
        where: { tenantId, id: runId },
        include: {
          validationRuns: { orderBy: { createdAt: 'desc' }, take: 1 },
          validationIssues: {
            where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
            orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
          },
        },
      });
      if (!run) notFound('PAYROLL_RUN_NOT_FOUND', 'Payroll run');
      return {
        data: {
          ready: run.status === 'INPUTS_READY',
          status: run.status,
          readiness: run.readiness,
          lastValidatedAt: run.lastValidatedAt,
          latestValidation: run.validationRuns[0] ?? null,
          issues: run.validationIssues,
        },
      };
    });
  }

  listValidationIssues(tenantId: string, runId: string) {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.payrollValidationIssue.findMany({
        where: { tenantId, payrollRunId: runId },
        orderBy: [{ createdAt: 'desc' }],
      }),
    }));
  }

  acknowledgeIssue(
    actor: Actor,
    issueId: string,
    dto: AcknowledgePayrollValidationIssueDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const issue = await tx.payrollValidationIssue.findFirst({
        where: { tenantId: actor.tenantId, id: issueId },
      });
      if (!issue)
        notFound('PAYROLL_VALIDATION_ISSUE_NOT_FOUND', 'Validation issue');
      if (issue.status !== 'OPEN') return { data: issue };
      const updated = await tx.payrollValidationIssue.update({
        where: { id: issue.id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedBy: actor.userId,
          context: json({
            ...objectValue(issue.context),
            acknowledgementNote: dto.note,
          }),
        },
      });
      await timeline(
        tx,
        actor,
        issue.payrollRunId,
        'payroll.validation_issue.acknowledged',
        {
          issueId: issue.id,
          code: issue.code,
        },
      );
      return { data: updated };
    });
  }

  private async requireDraftRun(
    tx: PrismaTransaction,
    tenantId: string,
    id: string,
  ) {
    const run = await tx.payrollRun.findFirst({ where: { tenantId, id } });
    if (!run) notFound('PAYROLL_RUN_NOT_FOUND', 'Payroll run');
    if (run.status !== 'DRAFT' && run.status !== 'VALIDATING') {
      throw new ConflictException({
        code: 'PAYROLL_RUN_INPUTS_IMMUTABLE',
        message: 'Payroll run inputs are immutable after INPUTS_READY.',
      });
    }
    return run;
  }
}

async function timeline(
  tx: PrismaTransaction,
  actor: Actor,
  payrollRunId: string,
  action: string,
  payload: Record<string, unknown>,
) {
  await tx.payrollRunTimeline.create({
    data: {
      tenantId: actor.tenantId,
      payrollRunId,
      action,
      actorUserId: actor.userId,
      payload: json(payload),
    },
  });
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function computeChecksum(value: string) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function parseInputCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const [headerLine, ...body] = lines;
  const headers = splitCsvLine(headerLine ?? '').map((item) => item.trim());
  const required = ['employeeId', 'kind', 'code', 'amountMinor', 'currency'];
  const missing = required.filter((field) => !headers.includes(field));
  const rows: Array<Record<string, string>> = [];
  const errors: Array<Record<string, unknown>> = [];
  if (missing.length) {
    return {
      rowCount: body.length,
      rows,
      errors: [
        {
          rowNumber: 1,
          code: 'CSV_HEADERS_MISSING',
          message: missing.join(', '),
        },
      ],
    };
  }
  body.forEach((line, index) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(
      headers.map((header, column) => [header, values[column]?.trim() ?? '']),
    );
    const rowErrors = validateInputCsvRow(row);
    if (rowErrors.length) {
      errors.push({
        rowNumber: index + 2,
        code: 'CSV_ROW_INVALID',
        message: rowErrors.join('; '),
      });
    } else {
      rows.push(row);
    }
  });
  return { rowCount: body.length, rows, errors };
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function validateInputCsvRow(row: Record<string, string>) {
  const errors: string[] = [];
  if (row.employeeId && !isUuid(row.employeeId))
    errors.push('employeeId must be a UUID');
  if (!Object.values(PayrollInputKind).includes(row.kind as PayrollInputKind)) {
    errors.push('kind is invalid');
  }
  if (!/^[A-Z0-9_-]{2,60}$/.test(row.code ?? ''))
    errors.push('code is invalid');
  if (!/^-?\d+$/.test(row.amountMinor ?? ''))
    errors.push('amountMinor must be an integer minor-unit amount');
  if (!/^[A-Z]{3}$/.test(row.currency ?? ''))
    errors.push('currency must be ISO-4217');
  return errors;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.reduce<Array<Record<string, unknown>>>((items, item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      items.push(item as Record<string, unknown>);
    }
    return items;
  }, []);
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function scalarString(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function objectValue(value: Prisma.JsonValue) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function notFound(code: string, name: string): never {
  throw new NotFoundException({ code, message: `${name} was not found` });
}

function duplicateRun(): never {
  throw new ConflictException({
    code: 'PAYROLL_RUN_ALREADY_EXISTS',
    message: 'A Payroll run already exists for this pay group and period.',
  });
}

function serializeBigInt<T>(value: T): T {
  const serialized = JSON.stringify(value, (_key: string, item: unknown) =>
    typeof item === 'bigint' ? item.toString() : item,
  );
  return JSON.parse(serialized) as T;
}

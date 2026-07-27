import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayComponentType, PayrollOutputKind, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import {
  GeneratePayrollOutputDto,
  MarkPayrollPaidDto,
  PayrollActionReasonDto,
  PayrollOverrideResultDto,
} from '../dto/payroll-processing.dto';

type Actor = { tenantId: string; userId: string };
type CalculationComponent = {
  code: string;
  name: string;
  type: PayComponentType;
  taxable: boolean;
  amount: bigint;
  payComponentId: string | null;
  trace: Record<string, unknown>;
};
type StructureComponentInput = {
  fixedAmountMinor: bigint | null;
  percentageBasisPoints: number | null;
  formulaReference: string | null;
  componentVersion: {
    valueMode: string;
    config: Prisma.JsonValue;
  };
};
type FormulaContext = Record<string, bigint>;
const calculationVersion = 'deterministic-fixed-v1';

@Injectable()
export class PayrollProcessingService {
  constructor(private readonly prisma: PrismaService) {}

  calculate(actor: Actor, runId: string) {
    return this.prisma.forTenant(async (tx) => {
      const run = await requireRun(tx, actor.tenantId, runId);
      if (!['INPUTS_READY', 'CALCULATED', 'REVIEWED'].includes(run.status)) {
        invalidState('Payroll run must be INPUTS_READY before calculation.');
      }
      await tx.payrollRun.update({
        where: { id: run.id },
        data: { status: 'CALCULATING', calculationVersion },
      });
      await tx.payrollComponentResult.deleteMany({
        where: {
          tenantId: actor.tenantId,
          employeeResult: { payrollRunId: run.id },
        },
      });
      await tx.payrollEmployeeResult.deleteMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
      });

      const employees = await tx.payrollRunEmployee.findMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
      });
      const inputs = await tx.payrollRunInput.findMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
      });

      for (const employee of employees) {
        const profile = employee.employeePayrollProfileId
          ? await tx.employeePayrollProfile.findFirst({
              where: {
                tenantId: actor.tenantId,
                id: employee.employeePayrollProfileId,
              },
            })
          : null;
        if (!profile) continue;
        const compensation = await tx.employeeCompensationVersion.findFirst({
          where: {
            tenantId: actor.tenantId,
            employeePayrollProfileId: profile.id,
            effectiveFrom: { lte: run.periodEnd },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: run.periodStart } },
            ],
          },
          include: {
            salaryStructureVersion: {
              include: {
                components: {
                  include: {
                    componentVersion: { include: { component: true } },
                  },
                  orderBy: { calculationOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { effectiveFrom: 'desc' },
        });
        if (!compensation) continue;
        const periodDays = daysInclusive(run.periodStart, run.periodEnd);
        const payableDays = BigInt(employee.payableDays ?? periodDays);
        const components: CalculationComponent[] = [];
        for (const component of compensation.salaryStructureVersion
          .components) {
          const grossSoFar = sum(
            components
              .filter((item) => isEarning(item.type))
              .map((item) => item.amount),
          );
          const calculation = calculateStructureComponent(component, {
            baseAmountMinor: compensation.baseAmountMinor,
            fixedAmountMinor: component.fixedAmountMinor ?? 0n,
            percentageBasisPoints: BigInt(component.percentageBasisPoints ?? 0),
            payableDays,
            periodDays: BigInt(periodDays),
            lossOfPayDays: BigInt(employee.lossOfPayDays ?? 0),
            overtimeMinutes: BigInt(employee.overtimeMinutes ?? 0),
            grossSoFar,
          });
          components.push({
            code: component.componentVersion.component.code,
            name: component.componentVersion.component.name,
            type: component.componentVersion.component.type,
            taxable: component.componentVersion.taxable,
            amount: calculation.amount,
            payComponentId: component.componentVersion.componentId,
            trace: {
              source: 'salary_structure_component',
              componentVersionId: component.payComponentVersionId,
              ...calculation.trace,
            },
          });
        }
        for (const input of inputs.filter(
          (item) => !item.employeeId || item.employeeId === employee.employeeId,
        )) {
          if (input.amountMinor === null) continue;
          components.push({
            code: input.code,
            name: input.code,
            type:
              input.amountMinor < 0n
                ? PayComponentType.DEDUCTION
                : PayComponentType.EARNING,
            taxable: false,
            amount:
              input.amountMinor < 0n ? -input.amountMinor : input.amountMinor,
            payComponentId: null,
            trace: {
              source: 'payroll_run_input',
              inputId: input.id,
              kind: input.kind,
            },
          });
        }
        const gross = sum(
          components
            .filter((item) => isEarning(item.type))
            .map((item) => item.amount),
        );
        const deductions = sum(
          components
            .filter((item) => item.type === 'DEDUCTION')
            .map((item) => item.amount),
        );
        const taxable = sum(
          components.filter((item) => item.taxable).map((item) => item.amount),
        );
        const employerCost = sum(
          components
            .filter((item) => item.type === 'EMPLOYER_CONTRIBUTION')
            .map((item) => item.amount),
        );
        const previous = await tx.payrollEmployeeResult.findFirst({
          where: {
            tenantId: actor.tenantId,
            employeeId: employee.employeeId,
            run: {
              payGroupId: run.payGroupId,
              periodStart: { lt: run.periodStart },
              status: {
                in: ['CALCULATED', 'REVIEWED', 'APPROVED', 'FINALIZED', 'PAID'],
              },
            },
          },
          orderBy: { run: { periodStart: 'desc' } },
        });
        const netPay = gross - deductions;
        const variance = previous
          ? {
              previousRunId: previous.payrollRunId,
              previousNetPayMinor: previous.netPayMinor.toString(),
              netPayDeltaMinor: (netPay - previous.netPayMinor).toString(),
              grossPayDeltaMinor: (gross - previous.grossPayMinor).toString(),
            }
          : { previousRunId: null };
        const result = await tx.payrollEmployeeResult.create({
          data: {
            tenantId: actor.tenantId,
            payrollRunId: run.id,
            employeeId: employee.employeeId,
            grossPayMinor: gross,
            taxablePayMinor: taxable,
            deductionMinor: deductions,
            netPayMinor: netPay,
            currency: compensation.currency,
            breakdown: json({
              calculationVersion,
              payableDays: payableDays.toString(),
              periodDays,
              employerCostMinor: employerCost.toString(),
            }),
            variance: json(variance),
          },
        });
        await tx.payrollComponentResult.createMany({
          data: components.map((component) => ({
            tenantId: actor.tenantId,
            employeeResultId: result.id,
            employeeId: employee.employeeId,
            payComponentId: component.payComponentId,
            code: component.code,
            name: component.name,
            componentType: component.type,
            amountMinor: component.amount,
            taxable: component.taxable,
            calculationTrace: json(component.trace),
          })),
        });
      }

      const calculatedResults = await tx.payrollEmployeeResult.findMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
        include: { components: true },
        orderBy: { employeeId: 'asc' },
      });
      const runTotals = {
        grossPayMinor: sum(calculatedResults.map((item) => item.grossPayMinor)),
        taxablePayMinor: sum(
          calculatedResults.map((item) => item.taxablePayMinor),
        ),
        deductionMinor: sum(
          calculatedResults.map((item) => item.deductionMinor),
        ),
        employerCostMinor: sum(
          calculatedResults.flatMap((item) =>
            item.components
              .filter(
                (component) =>
                  component.componentType === 'EMPLOYER_CONTRIBUTION',
              )
              .map((component) => component.amountMinor),
          ),
        ),
        netPayMinor: sum(calculatedResults.map((item) => item.netPayMinor)),
      };
      const resultChecksum = checksum({
        calculationVersion,
        runId: run.id,
        totals: stringifyBigInts(runTotals),
        employees: calculatedResults.map((item) => ({
          employeeId: item.employeeId,
          grossPayMinor: item.grossPayMinor.toString(),
          deductionMinor: item.deductionMinor.toString(),
          netPayMinor: item.netPayMinor.toString(),
        })),
      });
      const updated = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: 'CALCULATED',
          calculationVersion,
          grossPayMinor: runTotals.grossPayMinor,
          taxablePayMinor: runTotals.taxablePayMinor,
          deductionMinor: runTotals.deductionMinor,
          employerCostMinor: runTotals.employerCostMinor,
          netPayMinor: runTotals.netPayMinor,
          resultChecksum,
          updatedBy: actor.userId,
        },
        include: { employeeResults: true },
      });
      await timeline(tx, actor, run.id, 'payroll.run.calculated', {
        calculationVersion,
        resultChecksum,
        employeeCount: updated.employeeResults.length,
      });
      return { data: updated };
    });
  }

  review(actor: Actor, runId: string, dto: PayrollActionReasonDto) {
    return this.prisma.forTenant(async (tx) => {
      const run = await requireRun(tx, actor.tenantId, runId);
      await assertNoOpenBlockers(tx, actor.tenantId, run.id);
      return this.transitionInTx(
        tx,
        actor,
        run,
        ['CALCULATED'],
        'REVIEWED',
        'payroll.run.reviewed',
        {
          reviewedAt: new Date(),
          reviewedBy: actor.userId,
          reason: dto.reason,
        },
      );
    });
  }

  approve(actor: Actor, runId: string, dto: PayrollActionReasonDto) {
    return this.prisma.forTenant(async (tx) => {
      const run = await requireRun(tx, actor.tenantId, runId);
      await assertNoOpenBlockers(tx, actor.tenantId, run.id);
      if (run.createdBy === actor.userId) {
        throw new ConflictException({
          code: 'PAYROLL_FOUR_EYES_REQUIRED',
          message: 'The run creator cannot approve the same payroll run.',
        });
      }
      return this.transitionInTx(
        tx,
        actor,
        run,
        ['REVIEWED'],
        'APPROVED',
        'payroll.run.approved',
        {
          approvedAt: new Date(),
          approvedBy: actor.userId,
          reason: dto.reason,
        },
      );
    });
  }

  finalize(actor: Actor, runId: string, dto: PayrollActionReasonDto) {
    return this.prisma.forTenant(async (tx) => {
      const run = await requireRun(tx, actor.tenantId, runId);
      const response = await this.transitionInTx(
        tx,
        actor,
        run,
        ['APPROVED'],
        'FINALIZED',
        'payroll.run.finalized',
        {
          finalizedAt: new Date(),
          finalizedBy: actor.userId,
          reason: dto.reason,
        },
      );
      await tx.payrollEmployeeResult.updateMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
        data: { status: 'FINAL' },
      });
      return response;
    });
  }

  overrideResult(
    actor: Actor,
    resultId: string,
    dto: PayrollOverrideResultDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const result = await tx.payrollEmployeeResult.findFirst({
        where: { tenantId: actor.tenantId, id: resultId },
        include: { run: true },
      });
      if (!result) notFound('PAYROLL_RESULT_NOT_FOUND', 'Payroll result');
      if (!['CALCULATED', 'REVIEWED'].includes(result.run.status)) {
        invalidState('Overrides are allowed only before approval.');
      }
      const updated = await tx.payrollEmployeeResult.update({
        where: { id: result.id },
        data: {
          netPayMinor: BigInt(dto.netPayMinor),
          status: 'OVERRIDDEN',
          overrideReason: dto.reason,
          overriddenBy: actor.userId,
        },
      });
      await timeline(
        tx,
        actor,
        result.payrollRunId,
        'payroll.result.overridden',
        {
          employeeId: result.employeeId,
          reason: dto.reason,
        },
      );
      return { data: updated };
    });
  }

  generateOutput(actor: Actor, runId: string, dto: GeneratePayrollOutputDto) {
    return this.prisma.forTenant(async (tx) => {
      const run = await requireRun(tx, actor.tenantId, runId);
      if (
        !['FINALIZED', 'OUTPUTS_GENERATED', 'PUBLISHED'].includes(run.status)
      ) {
        invalidState(
          'Outputs can be generated only from a finalized payroll run.',
        );
      }
      const results = await tx.payrollEmployeeResult.findMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
        include: { components: true },
      });
      if (dto.kind === 'ACCOUNTING_EXPORT') {
        await assertAccountingMappings(tx, actor.tenantId, results);
      }
      if (dto.kind === 'PAYSLIP') {
        for (const result of results) {
          await tx.payrollPayslip.upsert({
            where: {
              tenantId_payrollRunId_employeeId: {
                tenantId: actor.tenantId,
                payrollRunId: run.id,
                employeeId: result.employeeId,
              },
            },
            create: {
              tenantId: actor.tenantId,
              payrollRunId: run.id,
              employeeId: result.employeeId,
              payslipNumber: `${run.periodKey}-${result.employeeId.slice(0, 8)}`,
              grossPayMinor: result.grossPayMinor,
              netPayMinor: result.netPayMinor,
              currency: result.currency,
              payload: json({ result, components: result.components }),
            },
            update: {
              grossPayMinor: result.grossPayMinor,
              netPayMinor: result.netPayMinor,
              payload: json({ result, components: result.components }),
            },
          });
        }
      }
      const payload = outputPayload(dto.kind, run.periodKey, results);
      const output = await tx.payrollOutputExport.create({
        data: {
          tenantId: actor.tenantId,
          payrollRunId: run.id,
          kind: dto.kind,
          adapterKey: dto.adapterKey,
          checksum: checksum(payload),
          payload: json(payload),
          createdBy: actor.userId,
        },
      });
      await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: 'OUTPUTS_GENERATED',
          outputsGeneratedAt: new Date(),
          updatedBy: actor.userId,
        },
      });
      await timeline(tx, actor, run.id, 'payroll.output.generated', {
        kind: output.kind,
        outputId: output.id,
      });
      return { data: output };
    });
  }

  publish(actor: Actor, runId: string) {
    return this.prisma.forTenant(async (tx) => {
      const run = await requireRun(tx, actor.tenantId, runId);
      if (!['OUTPUTS_GENERATED', 'PUBLISHED'].includes(run.status)) {
        invalidState(
          'Payslips can be published only after outputs are generated.',
        );
      }
      await tx.payrollPayslip.updateMany({
        where: { tenantId: actor.tenantId, payrollRunId: run.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      const updated = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          updatedBy: actor.userId,
        },
      });
      await timeline(tx, actor, run.id, 'payroll.payslips.published', {});
      return { data: updated };
    });
  }

  markPaid(actor: Actor, runId: string, dto: MarkPayrollPaidDto) {
    return this.prisma.forTenant(async (tx) => {
      const run = await requireRun(tx, actor.tenantId, runId);
      if (!['PUBLISHED', 'PAID'].includes(run.status)) {
        invalidState('Payroll can be marked paid only after publishing.');
      }
      if (dto.reference) {
        const existing = await tx.payrollPaymentBatch.findFirst({
          where: {
            tenantId: actor.tenantId,
            payrollRunId: run.id,
            reference: dto.reference,
          },
        });
        if (existing) return { data: { run, batch: existing } };
      }
      const batch = await tx.payrollPaymentBatch.create({
        data: {
          tenantId: actor.tenantId,
          payrollRunId: run.id,
          status: dto.status,
          reference: dto.reference,
          paidAt: dto.status === 'PAID' ? new Date() : undefined,
          createdBy: actor.userId,
        },
      });
      const updated = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: dto.status === 'PAID' ? 'PAID' : run.status,
          paidAt: dto.status === 'PAID' ? new Date() : undefined,
          updatedBy: actor.userId,
        },
      });
      await timeline(tx, actor, run.id, 'payroll.payment.status_updated', {
        status: dto.status,
        reference: dto.reference,
      });
      return { data: { run: updated, batch } };
    });
  }

  listPayslips(tenantId: string, runId: string) {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.payrollPayslip.findMany({
        where: { tenantId, payrollRunId: runId },
        orderBy: { payslipNumber: 'asc' },
      }),
    }));
  }

  listMyPayslips(actor: Actor) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findFirst({
        where: { tenantId: actor.tenantId, userId: actor.userId },
      });
      if (!employee)
        notFound('EMPLOYEE_SELF_PROFILE_NOT_FOUND', 'Employee profile');
      return {
        data: await tx.payrollPayslip.findMany({
          where: {
            tenantId: actor.tenantId,
            employeeId: employee.id,
            status: 'PUBLISHED',
          },
          orderBy: { createdAt: 'desc' },
        }),
      };
    });
  }

  private transition(
    actor: Actor,
    runId: string,
    from: string[],
    to: 'REVIEWED' | 'APPROVED' | 'FINALIZED',
    action: string,
    payload: Record<string, unknown>,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const run = await requireRun(tx, actor.tenantId, runId);
      return this.transitionInTx(tx, actor, run, from, to, action, payload);
    });
  }

  private async transitionInTx(
    tx: PrismaTransaction,
    actor: Actor,
    run: { id: string; status: string },
    from: string[],
    to: 'REVIEWED' | 'APPROVED' | 'FINALIZED',
    action: string,
    payload: Record<string, unknown>,
  ) {
    if (!from.includes(run.status))
      invalidState(`Payroll run must be ${from.join(' or ')}.`);
    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: to,
        ...stripTransitionPayload(payload),
        updatedBy: actor.userId,
      },
    });
    await timeline(tx, actor, run.id, action, payload);
    return { data: updated };
  }
}

function outputPayload(
  kind: PayrollOutputKind,
  periodKey: string,
  results: Array<{
    employeeId: string;
    grossPayMinor: bigint;
    deductionMinor: bigint;
    netPayMinor: bigint;
    currency: string;
  }>,
) {
  const totals = {
    grossPayMinor: sum(results.map((item) => item.grossPayMinor)).toString(),
    deductionMinor: sum(results.map((item) => item.deductionMinor)).toString(),
    netPayMinor: sum(results.map((item) => item.netPayMinor)).toString(),
  };
  return {
    kind,
    periodKey,
    totals,
    rows: results.map((item) => ({
      employeeId: item.employeeId,
      grossPayMinor: item.grossPayMinor.toString(),
      deductionMinor: item.deductionMinor.toString(),
      netPayMinor: item.netPayMinor.toString(),
      currency: item.currency,
    })),
  };
}

async function requireRun(tx: PrismaTransaction, tenantId: string, id: string) {
  const run = await tx.payrollRun.findFirst({ where: { tenantId, id } });
  if (!run) notFound('PAYROLL_RUN_NOT_FOUND', 'Payroll run');
  return run;
}

async function assertNoOpenBlockers(
  tx: PrismaTransaction,
  tenantId: string,
  payrollRunId: string,
) {
  const blocker = await tx.payrollValidationIssue.findFirst({
    where: {
      tenantId,
      payrollRunId,
      severity: 'BLOCKER',
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
    },
  });
  if (blocker) {
    throw new ConflictException({
      code: 'PAYROLL_VALIDATION_BLOCKERS_OPEN',
      message: 'Resolve payroll validation blockers before review or approval.',
    });
  }
}

async function assertAccountingMappings(
  tx: PrismaTransaction,
  tenantId: string,
  results: Array<{
    components: Array<{ payComponentId: string | null; code: string }>;
  }>,
) {
  const componentIds = [
    ...new Set(
      results.flatMap((result) =>
        result.components
          .map((component) => component.payComponentId)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  ];
  if (!componentIds.length) return;
  const mappings = await tx.payrollAccountingMapping.findMany({
    where: {
      tenantId,
      payComponentId: { in: componentIds },
      status: 'ACTIVE',
    },
  });
  const mapped = new Set(mappings.map((mapping) => mapping.payComponentId));
  const missing = componentIds.filter((id) => !mapped.has(id));
  if (missing.length) {
    throw new ConflictException({
      code: 'PAYROLL_ACCOUNTING_MAPPING_MISSING',
      message:
        'Accounting export requires active mappings for every mapped component.',
      missingComponentIds: missing,
    });
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

function daysInclusive(start: Date, end: Date) {
  return Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
}

function prorate(amount: bigint, payableDays: bigint, periodDays: bigint) {
  return (amount * payableDays + periodDays / 2n) / periodDays;
}

function calculateStructureComponent(
  component: StructureComponentInput,
  context: FormulaContext & {
    fixedAmountMinor: bigint;
    percentageBasisPoints: bigint;
    periodDays: bigint;
    payableDays: bigint;
  },
) {
  const expression = formulaExpression(component);
  if (expression) {
    const amount = evaluateFormula(expression, context);
    return {
      amount,
      trace: {
        method: 'formula_reference',
        expression,
        variables: stringifyBigInts(context),
        resultMinor: amount.toString(),
      },
    };
  }
  if (component.percentageBasisPoints !== null) {
    const percentageAmount =
      (context.baseAmountMinor * BigInt(component.percentageBasisPoints)) /
      10_000n;
    const amount = prorate(
      percentageAmount,
      context.payableDays,
      context.periodDays,
    );
    return {
      amount,
      trace: {
        method: 'percentage',
        baseAmountMinor: context.baseAmountMinor.toString(),
        percentageBasisPoints: String(component.percentageBasisPoints),
        payableDays: context.payableDays.toString(),
        periodDays: context.periodDays.toString(),
      },
    };
  }
  const fixed = component.fixedAmountMinor ?? 0n;
  const amount = prorate(fixed, context.payableDays, context.periodDays);
  return {
    amount,
    trace: {
      method: 'fixed',
      fixedAmountMinor: fixed.toString(),
      payableDays: context.payableDays.toString(),
      periodDays: context.periodDays.toString(),
    },
  };
}

function formulaExpression(component: StructureComponentInput) {
  if (component.componentVersion.valueMode !== 'FORMULA_REFERENCE') return null;
  const config = objectValue(component.componentVersion.config);
  const expression =
    stringValue(config.expression) ||
    stringValue(config.formula) ||
    component.formulaReference;
  if (!expression) {
    invalidState('Formula component is missing a configured expression.');
  }
  return expression;
}

function evaluateFormula(expression: string, context: FormulaContext) {
  if (!/^[A-Za-z0-9_+\-*/().,\s]+$/.test(expression)) {
    invalidState('Formula contains unsupported characters.');
  }
  const parser = new FormulaParser(expression, context);
  return parser.parse();
}

function isEarning(type: PayComponentType) {
  return type === 'EARNING' || type === 'REIMBURSEMENT';
}

function sum(values: bigint[]) {
  return values.reduce((total, value) => total + value, 0n);
}

function checksum(value: unknown) {
  return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

function stripTransitionPayload(payload: Record<string, unknown>) {
  const rest = { ...payload };
  delete rest.reason;
  return rest;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === 'bigint' ? item.toString() : item,
    ),
  ) as Prisma.InputJsonValue;
}

function stableJson(value: unknown) {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === 'bigint') return item.toString();
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).sort(
          ([left], [right]) => left.localeCompare(right),
        ),
      );
    }
    return item;
  });
}

function stringifyBigInts(value: Record<string, bigint>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item.toString()]),
  );
}

function objectValue(value: Prisma.JsonValue) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

class FormulaParser {
  private index = 0;

  constructor(
    private readonly expression: string,
    private readonly context: FormulaContext,
  ) {}

  parse() {
    const value = this.expressionNode();
    this.skip();
    if (this.index !== this.expression.length) {
      invalidState('Formula has trailing unsupported syntax.');
    }
    return value;
  }

  private expressionNode(): bigint {
    let value = this.term();
    while (true) {
      this.skip();
      if (this.match('+')) value += this.term();
      else if (this.match('-')) value -= this.term();
      else return value;
    }
  }

  private term(): bigint {
    let value = this.factor();
    while (true) {
      this.skip();
      if (this.match('*')) value *= this.factor();
      else if (this.match('/')) {
        const divisor = this.factor();
        if (divisor === 0n) invalidState('Formula attempted division by zero.');
        value /= divisor;
      } else return value;
    }
  }

  private factor(): bigint {
    this.skip();
    if (this.match('-')) return -this.factor();
    if (this.match('(')) {
      const value = this.expressionNode();
      this.expect(')');
      return value;
    }
    const token = this.token();
    if (/^\d+$/.test(token)) return BigInt(token);
    const value = this.context[token];
    if (value === undefined)
      invalidState(`Formula variable ${token} is not allowed.`);
    return value;
  }

  private token() {
    this.skip();
    const match = /^[A-Za-z_][A-Za-z0-9_]*|\d+/.exec(
      this.expression.slice(this.index),
    );
    if (!match) invalidState('Formula contains invalid syntax.');
    this.index += match[0].length;
    return match[0];
  }

  private match(char: string) {
    this.skip();
    if (this.expression[this.index] !== char) return false;
    this.index += 1;
    return true;
  }

  private expect(char: string) {
    if (!this.match(char)) invalidState(`Formula expected ${char}.`);
  }

  private skip() {
    while (/\s/.test(this.expression[this.index] ?? '')) this.index += 1;
  }
}

function notFound(code: string, name: string): never {
  throw new NotFoundException({ code, message: `${name} was not found` });
}

function invalidState(message: string): never {
  throw new ConflictException({ code: 'PAYROLL_RUN_STATE_INVALID', message });
}

import { ConflictException } from '@nestjs/common';
import { PayrollProcessingService } from './payroll-processing.service';

describe('PayrollProcessingService calculation and self-service', () => {
  it('calculates formula-reference components through the restricted evaluator', async () => {
    const tx = createProcessingTx();
    tx.payrollRun.findFirst.mockResolvedValue(run());
    tx.payrollRun.update
      .mockResolvedValueOnce({ ...run(), status: 'CALCULATING' })
      .mockResolvedValueOnce({
        ...run(),
        status: 'CALCULATED',
        employeeResults: [{ id: 'result-1' }],
      });
    tx.payrollRunEmployee.findMany.mockResolvedValue([
      {
        employeeId: employeeId(),
        employeePayrollProfileId: 'profile-1',
        payableDays: 15,
        lossOfPayDays: 15,
        overtimeMinutes: 120,
      },
    ]);
    tx.payrollRunInput.findMany.mockResolvedValue([]);
    tx.employeePayrollProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
    tx.employeeCompensationVersion.findFirst.mockResolvedValue(
      compensation('fixedAmountMinor + overtimeMinutes * 10'),
    );
    tx.payrollEmployeeResult.create.mockResolvedValue({ id: 'result-1' });
    tx.payrollEmployeeResult.findFirst.mockResolvedValue(null);
    tx.payrollEmployeeResult.findMany.mockResolvedValue([
      {
        employeeId: employeeId(),
        grossPayMinor: 101200n,
        taxablePayMinor: 101200n,
        deductionMinor: 0n,
        netPayMinor: 101200n,
        components: [
          {
            componentType: 'EARNING',
            amountMinor: 101200n,
          },
        ],
      },
    ]);

    await service(tx).calculate(actor(), run().id);

    const componentCreate = firstCallArg<{
      data: Array<{
        code: string;
        amountMinor: bigint;
        calculationTrace: Record<string, unknown>;
      }>;
    }>(tx.payrollComponentResult.createMany);
    expect(componentCreate.data[0]?.code).toBe('FORMULA');
    expect(componentCreate.data[0]?.amountMinor).toBe(101200n);
    expect(componentCreate.data[0]?.calculationTrace.method).toBe(
      'formula_reference',
    );
    expect(componentCreate.data[0]?.calculationTrace.expression).toBe(
      'fixedAmountMinor + overtimeMinutes * 10',
    );
    const finalRunUpdate = lastCallArg<{
      data: {
        grossPayMinor: bigint;
        netPayMinor: bigint;
        resultChecksum: string;
      };
    }>(tx.payrollRun.update);
    expect(finalRunUpdate.data.grossPayMinor).toBe(101200n);
    expect(finalRunUpdate.data.netPayMinor).toBe(101200n);
    expect(finalRunUpdate.data.resultChecksum).toMatch(/^sha256:/);
  });

  it('rejects unsafe formula syntax instead of evaluating arbitrary code', async () => {
    const tx = createProcessingTx();
    tx.payrollRun.findFirst.mockResolvedValue(run());
    tx.payrollRun.update.mockResolvedValue({ ...run(), status: 'CALCULATING' });
    tx.payrollRunEmployee.findMany.mockResolvedValue([
      {
        employeeId: employeeId(),
        employeePayrollProfileId: 'profile-1',
        payableDays: 30,
      },
    ]);
    tx.payrollRunInput.findMany.mockResolvedValue([]);
    tx.employeePayrollProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
    tx.employeeCompensationVersion.findFirst.mockResolvedValue(
      compensation('process.exit(1)'),
    );

    await expect(
      service(tx).calculate(actor(), run().id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.payrollEmployeeResult.create).not.toHaveBeenCalled();
  });

  it('lists only the current employee published payslips for self-service', async () => {
    const tx = createProcessingTx();
    tx.employee.findFirst.mockResolvedValue({ id: employeeId() });
    tx.payrollPayslip.findMany.mockResolvedValue([{ id: 'payslip-1' }]);

    await service(tx).listMyPayslips(actor());

    expect(tx.employee.findFirst).toHaveBeenCalledWith({
      where: { tenantId: actor().tenantId, userId: actor().userId },
    });
    expect(tx.payrollPayslip.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: actor().tenantId,
        employeeId: employeeId(),
        status: 'PUBLISHED',
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('uses tenant scope on administrative payslip listing', async () => {
    const tx = createProcessingTx();
    tx.payrollPayslip.findMany.mockResolvedValue([]);

    await service(tx).listPayslips(actor().tenantId, run().id);

    expect(tx.payrollPayslip.findMany).toHaveBeenCalledWith({
      where: { tenantId: actor().tenantId, payrollRunId: run().id },
      orderBy: { payslipNumber: 'asc' },
    });
  });

  it('creates signed admin payslip downloads only through tenant-scoped private objects', async () => {
    const tx = createProcessingTx();
    const storage = createStorage();
    tx.payrollPayslip.findFirst.mockResolvedValue({
      id: 'payslip-1',
      tenantId: actor().tenantId,
      employeeId: employeeId(),
      objectKey:
        'private/0197a91c-7b32-7c65-8c6f-b89f92d4eb40/payroll-payslips/0197a91c-7b32-7c65-8c6f-b89f92d4eb42/payslip-1.pdf',
    });

    await service(tx, storage).downloadPayslip(actor(), 'payslip-1');

    expect(storage.signedPayrollPayslipDownload).toHaveBeenCalledWith(
      actor().tenantId,
      employeeId(),
      'private/0197a91c-7b32-7c65-8c6f-b89f92d4eb40/payroll-payslips/0197a91c-7b32-7c65-8c6f-b89f92d4eb42/payslip-1.pdf',
    );
  });

  it('creates signed export downloads from stored payroll export object keys', async () => {
    const tx = createProcessingTx();
    const storage = createStorage();
    tx.payrollOutputExport.findFirst.mockResolvedValue({
      id: 'output-1',
      tenantId: actor().tenantId,
      payrollRunId: run().id,
      payload: {
        objectKey:
          'private/0197a91c-7b32-7c65-8c6f-b89f92d4eb40/payroll-exports/0197a91c-7b32-7c65-8c6f-b89f92d4eb43/output-1.json',
      },
    });

    await service(tx, storage).downloadOutput(actor(), 'output-1');

    expect(storage.signedPayrollExportDownload).toHaveBeenCalledWith(
      actor().tenantId,
      run().id,
      'private/0197a91c-7b32-7c65-8c6f-b89f92d4eb40/payroll-exports/0197a91c-7b32-7c65-8c6f-b89f92d4eb43/output-1.json',
    );
  });
});

function service(
  tx: ReturnType<typeof createProcessingTx>,
  storage = createStorage(),
) {
  return new PayrollProcessingService(
    {
      forTenant: (callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
    } as never,
    storage as never,
  );
}

function createStorage() {
  return {
    putPayrollPayslip: jest
      .fn()
      .mockResolvedValue(
        'private/0197a91c-7b32-7c65-8c6f-b89f92d4eb40/payroll-payslips/0197a91c-7b32-7c65-8c6f-b89f92d4eb42/payslip-1.pdf',
      ),
    putPayrollExport: jest
      .fn()
      .mockResolvedValue(
        'private/0197a91c-7b32-7c65-8c6f-b89f92d4eb40/payroll-exports/0197a91c-7b32-7c65-8c6f-b89f92d4eb43/output-1.json',
      ),
    signedPayrollPayslipDownload: jest
      .fn()
      .mockResolvedValue({ url: 'memory://payslip', expiresIn: 300 }),
    signedPayrollExportDownload: jest
      .fn()
      .mockResolvedValue({ url: 'memory://export', expiresIn: 900 }),
  };
}

function actor() {
  return {
    tenantId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb40',
    userId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb41',
  };
}

function employeeId() {
  return '0197a91c-7b32-7c65-8c6f-b89f92d4eb42';
}

function run() {
  return {
    id: '0197a91c-7b32-7c65-8c6f-b89f92d4eb43',
    tenantId: actor().tenantId,
    payGroupId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb44',
    periodKey: '2026-07',
    periodStart: new Date('2026-07-01T00:00:00Z'),
    periodEnd: new Date('2026-07-30T00:00:00Z'),
    status: 'INPUTS_READY',
    createdBy: '0197a91c-7b32-7c65-8c6f-b89f92d4eb45',
  };
}

function compensation(expression: string) {
  return {
    id: 'compensation-1',
    baseAmountMinor: 100000n,
    currency: 'OMR',
    salaryStructureVersion: {
      components: [
        {
          fixedAmountMinor: 100000n,
          percentageBasisPoints: null,
          formulaReference: null,
          payComponentVersionId: 'version-1',
          componentVersion: {
            valueMode: 'FORMULA_REFERENCE',
            taxable: true,
            config: { expression },
            componentId: 'component-1',
            component: {
              code: 'FORMULA',
              name: 'Formula earning',
              type: 'EARNING',
            },
          },
        },
      ],
    },
  };
}

function createProcessingTx() {
  return {
    payrollRun: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payrollComponentResult: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payrollEmployeeResult: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    payrollRunEmployee: { findMany: jest.fn() },
    payrollRunInput: { findMany: jest.fn() },
    employeePayrollProfile: { findFirst: jest.fn() },
    employeeCompensationVersion: { findFirst: jest.fn() },
    payrollRunTimeline: { create: jest.fn().mockResolvedValue({}) },
    payrollValidationIssue: { findFirst: jest.fn().mockResolvedValue(null) },
    payrollJobRun: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'job-1' }),
      update: jest.fn().mockResolvedValue({ id: 'job-1', status: 'COMPLETED' }),
      findMany: jest.fn(),
    },
    payrollPayslip: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payrollOutputExport: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    payrollPaymentBatch: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    payrollAccountingMapping: { findMany: jest.fn() },
    employee: { findFirst: jest.fn() },
  };
}

function firstCallArg<T>(mock: { mock: { calls: unknown[][] } }) {
  return mock.mock.calls[0]?.[0] as T;
}

function lastCallArg<T>(mock: { mock: { calls: unknown[][] } }) {
  return mock.mock.calls.at(-1)?.[0] as T;
}

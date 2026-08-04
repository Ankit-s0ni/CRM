import { ConflictException } from '@nestjs/common';
import { PayrollRunPreparationService } from './payroll-run-preparation.service';

describe('PayrollRunPreparationService imports and readiness', () => {
  it('imports attendance only for employees in the run pay group', async () => {
    const tx = createTx();
    tx.payrollRun.findFirst.mockResolvedValue(run({ payGroupId: 'pay-group-1' }));
    tx.employeePayrollProfile.findFirst
      .mockResolvedValueOnce({ id: 'profile-1', payGroupId: 'pay-group-1' })
      .mockResolvedValueOnce(null);
    tx.attendanceLog.findMany.mockResolvedValueOnce([
      {
        attendanceDate: new Date('2026-08-01T00:00:00.000Z'),
        attendanceStatus: 'PRESENT',
        lateMinutes: 0,
        overtimeMinutes: 45,
        totalWorkMinutes: 480,
      },
      {
        attendanceDate: new Date('2026-08-02T00:00:00.000Z'),
        attendanceStatus: 'ABSENT',
        lateMinutes: 0,
        overtimeMinutes: 0,
        totalWorkMinutes: 0,
      },
    ]);

    await service(tx).importAttendanceSnapshot(actor(), run().id, {
      source: 'manual-preview',
      sourceVersion: 'manual-v1',
      checksum: 'manual:run',
      rows: [
        {
          employeeId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb42',
          payableDays: 30,
          lossOfPayDays: 0,
          overtimeMinutes: 0,
        },
        {
          employeeId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb45',
          payableDays: 30,
          lossOfPayDays: 0,
          overtimeMinutes: 0,
        },
      ],
    });

    expect(tx.payrollRunEmployee.create).toHaveBeenCalledTimes(1);
    expect(tx.payrollRunEmployee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb42',
          employeePayrollProfileId: 'profile-1',
          payableDays: 1,
          lossOfPayDays: 2,
          overtimeMinutes: 45,
        }),
      }),
    );
    expect(tx.attendanceLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          attendanceDate: {
            gte: run().periodStart,
            lte: run().periodEnd,
          },
        }),
      }),
    );
  });

  it('previews CSV rows with validation errors and tenant-scoped import metadata', async () => {
    const tx = createTx();
    tx.payrollRun.findFirst.mockResolvedValue(run());
    tx.payrollInputImport.findFirst.mockResolvedValue(null);
    tx.payrollInputImport.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'import-1', ...data }),
    );

    const result = await service(tx).previewInputCsv(actor(), run().id, {
      fileName: 'inputs.csv',
      csvText:
        'employeeId,kind,code,amountMinor,currency,reason\nnot-a-uuid,ONE_TIME,BONUS,1000,OMR,bad\n',
    });

    const createImport = firstCallArg<{
      data: {
        tenantId: string;
        payrollRunId: string;
        rowCount: number;
        validRowCount: number;
        errorCount: number;
      };
    }>(tx.payrollInputImport.create);
    expect(createImport.data.tenantId).toBe(actor().tenantId);
    expect(createImport.data.payrollRunId).toBe(run().id);
    expect(createImport.data.rowCount).toBe(1);
    expect(createImport.data.validRowCount).toBe(0);
    expect(createImport.data.errorCount).toBe(1);
    expect(result.data.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CSV_ROW_INVALID' }),
      ]),
    );
  });

  it('blocks commit when preview has row errors', async () => {
    const tx = createTx();
    tx.payrollRun.findFirst.mockResolvedValue(run());
    tx.payrollInputImport.findFirst.mockResolvedValue({
      id: 'import-1',
      status: 'PREVIEW_READY',
      errorCount: 1,
    });

    await expect(
      service(tx).commitInputImport(actor(), run().id, 'import-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.payrollRunInput.createMany).not.toHaveBeenCalled();
  });

  it('commits valid CSV inputs idempotently with negative minor-unit support', async () => {
    const tx = createTx();
    tx.payrollRun.findFirst.mockResolvedValue(run());
    tx.payrollInputImport.findFirst.mockResolvedValue({
      id: 'import-1',
      status: 'PREVIEW_READY',
      errorCount: 0,
      previewRows: [
        {
          rowNumber: 2,
          employeeId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb42',
          kind: 'ONE_TIME',
          code: 'RECOVERY',
          amountMinor: '-1250',
          currency: 'OMR',
          reason: 'Test recovery',
        },
      ],
    });
    tx.payrollInputImport.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'import-1', ...data }),
    );

    await service(tx).commitInputImport(actor(), run().id, 'import-1');

    expect(tx.payrollRunInput.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            tenantId: actor().tenantId,
            payrollRunId: run().id,
            amountMinor: -1250n,
            idempotencyKey: 'import-1:2',
          }),
        ],
      }),
    );
    const runUpdate = firstCallArg<{
      where: { id: string };
      data: { inputVersion: { increment: number } };
    }>(tx.payrollRun.update);
    expect(runUpdate.where.id).toBe(run().id);
    expect(runUpdate.data.inputVersion).toEqual({ increment: 1 });
  });
});

function service(tx: ReturnType<typeof createTx>) {
  return new PayrollRunPreparationService({
    forTenant: (callback: (transaction: typeof tx) => unknown) => callback(tx),
  } as never);
}

function actor() {
  return {
    tenantId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb40',
    userId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb41',
  };
}

function run(overrides: Record<string, unknown> = {}) {
  return {
    id: '0197a91c-7b32-7c65-8c6f-b89f92d4eb43',
    tenantId: actor().tenantId,
    payGroupId: 'pay-group-1',
    periodStart: new Date('2026-08-01T00:00:00.000Z'),
    periodEnd: new Date('2026-08-03T00:00:00.000Z'),
    status: 'DRAFT',
    inputVersion: 1,
    ...overrides,
  };
}

function createTx() {
  return {
    payrollRun: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue(run()),
    },
    payGroup: { findFirst: jest.fn() },
    payrollRunTimeline: { create: jest.fn().mockResolvedValue({}) },
    employeePayrollProfile: { findFirst: jest.fn() },
    attendanceLog: { findMany: jest.fn().mockResolvedValue([]) },
    payrollRunEmployee: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
    },
    payrollInputImport: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollRunInput: {
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function firstCallArg<T>(mock: { mock: { calls: unknown[][] } }) {
  return mock.mock.calls[0]?.[0] as T;
}

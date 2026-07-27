import { ConflictException, NotFoundException } from '@nestjs/common';
import { PayrollPaymentMethod } from '@prisma/client';
import { PayrollAdministrationService } from './payroll-administration.service';
import type { ProtectedPayrollDataCipher } from '../ports/protected-payroll-data-cipher';
import type { PrismaService } from '../../../../shared/database/prisma.service';
import type { AuditService } from '../../../../platform/audit/public';

describe('PayrollAdministrationService', () => {
  const actor = { tenantId: 'tenant-a', userId: 'user-a' };
  const updatedAt = new Date('2026-07-01T00:00:00.000Z');

  it('uses tenant-scoped queries for list and audit APIs', async () => {
    const tx = createTx();
    tx.payrollCalendar.findMany.mockResolvedValue([]);
    tx.employeePayrollProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
    tx.employeePaymentDetail.findMany.mockResolvedValue([]);
    tx.tenantAuditLog.findMany.mockResolvedValue([]);
    tx.tenantAuditLog.count.mockResolvedValue(0);
    const { service } = createService(tx);

    await service.listCalendars('tenant-a');
    await service.listPaymentDetails('tenant-a', 'employee-a');
    await service.auditHistory('tenant-a', { page: 2, limit: 25 });

    expect(tx.payrollCalendar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-a' } }),
    );
    expect(tx.employeePayrollProfile.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', employeeId: 'employee-a' },
    });
    expect(tx.employeePaymentDetail.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-a', employeePayrollProfileId: 'profile-1' },
      }),
    );
    const auditListQuery = firstCallArg<{
      where: { tenantId: string; module: string };
    }>(tx.tenantAuditLog.findMany);
    expect(auditListQuery.where).toMatchObject({
      tenantId: 'tenant-a',
      module: 'payroll',
    });
  });

  it('encrypts payment details and keeps plaintext out of responses, audit, and outbox', async () => {
    const tx = createTx();
    tx.employeePayrollProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
    tx.employeePaymentDetail.findFirst.mockResolvedValue({ version: 1 });
    tx.employeePaymentDetail.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        id: 'payment-1',
        status: 'ACTIVE',
        updatedAt,
      }),
    );
    const { service, audit, outbox } = createService(tx);
    const secrets = [
      'BANK-ACCOUNT-TEST-998877',
      'OM12 3456 7890 1111 2222 3333',
      'ROUTING-445566',
    ];

    const result = await service.upsertPaymentDetail(actor, 'employee-a', {
      paymentMethod: PayrollPaymentMethod.BANK_TRANSFER,
      bankName: 'Bank of Test',
      accountHolderName: 'Payroll User',
      accountNumber: secrets[0],
      iban: secrets[1],
      routingNumber: secrets[2],
      swiftBic: 'TESTOMRX',
    });

    const createCall = firstCallArg<{ data: Record<string, unknown> }>(
      tx.employeePaymentDetail.create,
    );
    expect(createCall.data).toMatchObject({
      tenantId: 'tenant-a',
      employeePayrollProfileId: 'profile-1',
      accountNumberCiphertext: 'cipher-24',
      accountNumberLast4: '8877',
      ibanCiphertext: 'cipher-29',
      ibanLast4: '3333',
      routingCiphertext: 'cipher-14',
      routingLast4: '5566',
      encryptionKeyVersion: 'key-v1',
      version: 2,
    });
    expect(result.data).toMatchObject({
      id: 'payment-1',
      accountNumberMasked: '****8877',
      ibanMasked: '****3333',
      routingMasked: '****5566',
    });
    expect(result.data).not.toHaveProperty('accountNumberCiphertext');
    expect(result.data).not.toHaveProperty('encryptionKeyVersion');
    expectNoSecrets(result, secrets);
    expectNoSecrets(audit.append.mock.calls, secrets);
    expectNoSecrets(outbox.append.mock.calls, secrets);
  });

  it('encrypts statutory identifiers and only returns masked identifiers', async () => {
    const tx = createTx();
    tx.employeePayrollProfile.findFirst.mockResolvedValue({ id: 'profile-1' });
    tx.employeeStatutoryDetail.findFirst.mockResolvedValue({ version: 4 });
    tx.employeeStatutoryDetail.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        id: 'statutory-1',
        status: 'ACTIVE',
        updatedAt,
      }),
    );
    const { service, audit, outbox } = createService(tx);
    const secrets = ['TAX-ID-123456789'];

    const result = await service.upsertStatutoryDetail(actor, 'employee-a', {
      countryCode: 'OM',
      identifierType: 'TAX_ID',
      identifier: secrets[0],
      metadata: { issuingAuthority: 'tax-office' },
    });

    const createCall = firstCallArg<{ data: Record<string, unknown> }>(
      tx.employeeStatutoryDetail.create,
    );
    expect(createCall.data).toMatchObject({
      tenantId: 'tenant-a',
      employeePayrollProfileId: 'profile-1',
      identifierCiphertext: 'cipher-16',
      identifierLast4: '6789',
      encryptionKeyVersion: 'key-v1',
      version: 5,
    });
    expect(result.data).toMatchObject({
      id: 'statutory-1',
      identifierMasked: '****6789',
    });
    expect(result.data).not.toHaveProperty('identifierCiphertext');
    expect(result.data).not.toHaveProperty('encryptionKeyVersion');
    expectNoSecrets(result, secrets);
    expectNoSecrets(audit.append.mock.calls, secrets);
    expectNoSecrets(outbox.append.mock.calls, secrets);
  });

  it('does not read protected details when the tenant-scoped employee profile is missing', async () => {
    const tx = createTx();
    tx.employeePayrollProfile.findFirst.mockResolvedValue(null);
    const { service } = createService(tx);

    await expect(
      service.listPaymentDetails('tenant-b', 'employee-a'),
    ).rejects.toThrow(NotFoundException);
    expect(tx.employeePayrollProfile.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-b', employeeId: 'employee-a' },
    });
    expect(tx.employeePaymentDetail.findMany).not.toHaveBeenCalled();
  });

  it('enforces optimistic concurrency before calendar updates', async () => {
    const tx = createTx();
    tx.payrollCalendar.findFirst.mockResolvedValue({
      id: 'calendar-1',
      version: 2,
    });
    const { service } = createService(tx);

    await expect(
      service.updateCalendar(actor, 'calendar-1', { version: 1 }),
    ).rejects.toThrow(ConflictException);
    expect(tx.payrollCalendar.update).not.toHaveBeenCalled();
  });

  it('activates policy versions by retiring active siblings first', async () => {
    const tx = createTx();
    tx.payrollPolicyVersion.findFirst.mockResolvedValue({
      id: 'version-2',
      status: 'DRAFT',
    });
    tx.payrollPolicyVersion.update.mockResolvedValue({
      id: 'version-2',
      status: 'ACTIVE',
    });
    const { service, audit, outbox } = createService(tx);

    const result = await service.activatePolicyVersion(
      actor,
      'policy-1',
      'version-2',
    );

    expect(tx.payrollPolicyVersion.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', policyId: 'policy-1', status: 'ACTIVE' },
      data: { status: 'RETIRED' },
    });
    const updateCall = firstCallArg<{
      where: { id: string };
      data: { status: string; activatedBy: string };
    }>(tx.payrollPolicyVersion.update);
    expect(updateCall.where).toEqual({ id: 'version-2' });
    expect(updateCall.data).toMatchObject({
      status: 'ACTIVE',
      activatedBy: 'user-a',
    });
    expect(result.data).toEqual({ id: 'version-2', status: 'ACTIVE' });
    expect(audit.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId: 'tenant-a',
        module: 'payroll',
        action: 'payroll.policy.version_activated',
      }),
    );
    expect(outbox.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId: 'tenant-a',
        eventKey: 'payroll.policy.version_activated',
      }),
    );
  });
});

function createService(tx: ReturnType<typeof createTx>) {
  const prisma = {
    forTenant: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const audit = { append: jest.fn().mockResolvedValue(undefined) };
  const outbox = { append: jest.fn().mockResolvedValue(undefined) };
  const cipher: ProtectedPayrollDataCipher = {
    encrypt: jest.fn((value: string) =>
      Promise.resolve({
        ciphertext: `cipher-${value.length}`,
        keyVersion: 'key-v1',
      }),
    ),
    decrypt: jest.fn(),
  };

  return {
    service: new PayrollAdministrationService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      outbox,
      cipher,
    ),
    audit,
    outbox,
    cipher,
  };
}

function createTx() {
  return {
    payrollCalendar: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    employeePayrollProfile: {
      findFirst: jest.fn(),
    },
    employeePaymentDetail: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      update: jest.fn(),
    },
    employeeStatutoryDetail: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      update: jest.fn(),
    },
    payrollPolicyVersion: {
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
    },
    tenantAuditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

function expectNoSecrets(value: unknown, secrets: string[]) {
  const serialized = JSON.stringify(value);
  for (const secret of secrets) {
    expect(serialized).not.toContain(secret);
  }
}

function firstCallArg<T>(mock: jest.Mock, argumentIndex = 0): T {
  const calls = mock.mock.calls as unknown[][];
  return calls[0][argumentIndex] as T;
}

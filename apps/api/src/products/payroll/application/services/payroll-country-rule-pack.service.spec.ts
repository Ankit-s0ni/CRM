import { ConflictException } from '@nestjs/common';
import { PayrollCountryRulePackService } from './payroll-country-rule-pack.service';

describe('PayrollCountryRulePackService', () => {
  it('refuses to activate a country pack without approved legal fixture metadata', async () => {
    const tx = createTx();
    tx.payrollCountryRulePack.findFirst.mockResolvedValue({
      id: 'pack-1',
      tenantId: actor().tenantId,
      countryCode: 'OM',
      metadata: {},
    });

    await expect(
      service(tx).updateStatus(actor(), 'pack-1', { status: 'ACTIVE' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.payrollCountryRulePack.update).not.toHaveBeenCalled();
  });

  it('activates only approved packs and disables older active pack versions', async () => {
    const tx = createTx();
    tx.payrollCountryRulePack.findFirst.mockResolvedValue({
      id: 'pack-1',
      tenantId: actor().tenantId,
      countryCode: 'IN',
      metadata: {
        approvedSpecReference: 'LEGAL-IN-2026-01',
        goldenFixtureChecksum: 'sha256:test',
      },
    });
    tx.payrollCountryRulePack.update.mockResolvedValue({
      id: 'pack-1',
      status: 'ACTIVE',
    });

    await service(tx).updateStatus(actor(), 'pack-1', { status: 'ACTIVE' });

    expect(tx.payrollCountryRulePack.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: actor().tenantId,
        countryCode: 'IN',
        id: { not: 'pack-1' },
        status: 'ACTIVE',
      },
      data: { status: 'DISABLED' },
    });
    expect(tx.payrollCountryRulePack.update).toHaveBeenCalledWith({
      where: { id: 'pack-1' },
      data: { status: 'ACTIVE' },
    });
  });
});

function service(tx: ReturnType<typeof createTx>) {
  return new PayrollCountryRulePackService({
    forTenant: (callback: (transaction: typeof tx) => unknown) => callback(tx),
  } as never);
}

function actor() {
  return {
    tenantId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb40',
    userId: '0197a91c-7b32-7c65-8c6f-b89f92d4eb41',
  };
}

function createTx() {
  return {
    payrollCountryRulePack: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

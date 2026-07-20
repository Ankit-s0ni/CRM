import type { PrismaTransaction } from '../database/prisma.service';
import { provisionEmployeeLeaveBalances } from './provision-leave-balances';

const tenantId = '10000000-0000-4000-8000-000000000001';
const employeeId = '20000000-0000-4000-8000-000000000001';
const policyId = '30000000-0000-4000-8000-000000000001';

describe('provisionEmployeeLeaveBalances', () => {
  it('creates an opening balance and ledger credit for each missing policy', async () => {
    const tx = fixture();

    await provisionEmployeeLeaveBalances(tx.value, tenantId, employeeId);

    expect(tx.balanceUpsert).toHaveBeenCalledWith({
      where: {
        tenantId_employeeId_policyId: { tenantId, employeeId, policyId },
      },
      update: {},
      create: { tenantId, employeeId, policyId, remainingDays: 20 },
    });
    expect(tx.ledgerUpsert).toHaveBeenCalledWith({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey: `policy:${policyId}:employee:${employeeId}:initial`,
        },
      },
      update: {},
      create: {
        tenantId,
        balanceId: '40000000-0000-4000-8000-000000000001',
        entryType: 'CREDIT',
        days: 20,
        balanceAfter: 20,
        reason: 'Initial policy entitlement',
        actorUserId: undefined,
        idempotencyKey: `policy:${policyId}:employee:${employeeId}:initial`,
      },
    });
  });

  it('uses database upserts so repeated provisioning is idempotent', async () => {
    const tx = fixture();

    await provisionEmployeeLeaveBalances(tx.value, tenantId, employeeId);
    await provisionEmployeeLeaveBalances(tx.value, tenantId, employeeId);

    expect(tx.balanceUpsert).toHaveBeenCalledTimes(2);
    expect(tx.ledgerUpsert).toHaveBeenCalledTimes(2);
  });
});

function fixture() {
  const balanceUpsert = jest.fn().mockResolvedValue({
    id: '40000000-0000-4000-8000-000000000001',
    remainingDays: 20,
  });
  const ledgerUpsert = jest.fn().mockResolvedValue({});
  return {
    balanceUpsert,
    ledgerUpsert,
    value: {
      leavePolicy: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: policyId,
            accrualLogic: { annualEntitlement: 20 },
          },
        ]),
      },
      leaveBalance: {
        upsert: balanceUpsert,
      },
      leaveBalanceLedger: { upsert: ledgerUpsert },
    } as unknown as PrismaTransaction,
  };
}

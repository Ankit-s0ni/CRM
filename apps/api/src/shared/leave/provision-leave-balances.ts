import { LeaveBalanceEntryType, Prisma } from '@prisma/client';
import type { PrismaTransaction } from '../database/prisma.service';

export async function provisionEmployeeLeaveBalances(
  tx: PrismaTransaction,
  tenantId: string,
  employeeId: string,
  actorUserId?: string,
) {
  const policies = await tx.leavePolicy.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, accrualLogic: true },
  });

  for (const policy of policies) {
    const entitlement = annualEntitlement(policy.accrualLogic);
    const balance = await tx.leaveBalance.upsert({
      where: {
        tenantId_employeeId_policyId: {
          tenantId,
          employeeId,
          policyId: policy.id,
        },
      },
      update: {},
      create: {
        tenantId,
        employeeId,
        policyId: policy.id,
        remainingDays: entitlement,
      },
    });
    await tx.leaveBalanceLedger.upsert({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey: `policy:${policy.id}:employee:${employeeId}:initial`,
        },
      },
      update: {},
      create: {
        tenantId,
        balanceId: balance.id,
        entryType: LeaveBalanceEntryType.CREDIT,
        days: entitlement,
        balanceAfter: balance.remainingDays,
        reason: 'Initial policy entitlement',
        actorUserId,
        idempotencyKey: `policy:${policy.id}:employee:${employeeId}:initial`,
      },
    });
  }
}

function annualEntitlement(value: Prisma.JsonValue) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return 0;
  const entitlement = Number(value.annualEntitlement ?? 0);
  return Number.isFinite(entitlement) ? entitlement : 0;
}

import { SubscriptionStatus } from '@prisma/client';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';

const CURRENT = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.SUSPENDED,
];

export async function synchronizeSubscriptionSeats(
  tx: PrismaTransaction,
  tenantId: string,
  sourceEventId: string,
  actorUserId?: string,
) {
  const replay = await tx.tenantSubscriptionHistory.findUnique({
    where: {
      tenantId_sourceEventId: { tenantId, sourceEventId },
    },
  });
  if (replay) return { seatCount: replay.seatCount, replayed: true };
  await tx.$queryRaw`SELECT id FROM tenant_subscriptions WHERE "tenantId" = ${tenantId}::uuid AND status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED') FOR UPDATE`;
  const subscription = await tx.tenantSubscription.findFirst({
    where: { tenantId, status: { in: CURRENT } },
    include: { plan: true },
  });
  if (!subscription) return { seatCount: 0, replayed: false };
  const seatCount = await tx.employee.count({
    where: { tenantId, status: 'ACTIVE' },
  });
  const updated = await tx.tenantSubscription.update({
    where: { id: subscription.id },
    data: { seatCount },
  });
  await Promise.all([
    tx.tenantSubscriptionHistory.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        status: updated.status,
        seatCount,
        reason: 'Active employee seat synchronization',
        actorUserId,
        sourceEventId,
        snapshot: {
          previousSeatCount: subscription.seatCount,
          seatCount,
          planMaximum: subscription.plan.maxEmployees,
        },
      },
    }),
    tx.outboxEvent.create({
      data: {
        tenantId,
        eventKey: 'billing.subscription.seats_synchronized',
        payload: {
          tenantId,
          subscriptionId: subscription.id,
          previousSeatCount: subscription.seatCount,
          seatCount,
          sourceEventId,
        },
      },
    }),
  ]);
  return { seatCount, replayed: false };
}

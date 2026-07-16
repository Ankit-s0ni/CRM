import { EmployeeStatus, SubscriptionStatus } from '@prisma/client';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { EmployeeQuotaService } from './employee-quota.service';

describe('EmployeeQuotaService', () => {
  it('uses the lower of purchased seats and the plan maximum', async () => {
    const periodStart = new Date('2026-07-01T00:00:00.000Z');
    const periodEnd = new Date('2026-07-31T00:00:00.000Z');
    const findFirst = jest.fn().mockResolvedValue({
      id: 'subscription-id',
      seatCount: 12,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      plan: { maxEmployees: 10 },
    });
    const count = jest.fn().mockResolvedValue(8);
    const transaction = {
      tenantSubscription: { findFirst },
      employee: { count },
    } as unknown as PrismaTransaction;
    const service = new EmployeeQuotaService({} as OutboxService);

    await expect(
      service.getSnapshot(transaction, 'tenant-id'),
    ).resolves.toEqual({
      used: 8,
      limit: 10,
      percentage: 80,
      subscriptionId: 'subscription-id',
      periodStart,
      periodEnd,
    });
    expect(count).toHaveBeenCalledWith({
      where: {
        status: {
          in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_NOTICE],
        },
      },
    });
  });
});

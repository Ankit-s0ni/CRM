import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EmployeeStatus, SubscriptionStatus } from '@prisma/client';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';

const COUNTED_STATUSES = [
  EmployeeStatus.ACTIVE,
  EmployeeStatus.ON_NOTICE,
] as const;
const CURRENT_SUBSCRIPTION_STATUSES = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
] as const;

export type EmployeeQuotaSnapshot = {
  used: number;
  limit: number;
  percentage: number;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
};

@Injectable()
export class EmployeeQuotaService {
  constructor(private readonly outboxService: OutboxService) {}

  async getSnapshot(
    tx: PrismaTransaction,
    tenantId: string,
  ): Promise<EmployeeQuotaSnapshot> {
    const today = startOfUtcDay(new Date());
    const subscription = await tx.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: [...CURRENT_SUBSCRIPTION_STATUSES] },
        currentPeriodStart: { lte: today },
        currentPeriodEnd: { gte: today },
      },
      include: { plan: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!subscription) {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'A valid subscription is required to manage employees',
      });
    }

    const used = await tx.employee.count({
      where: { status: { in: [...COUNTED_STATUSES] } },
    });
    const limit = Math.min(
      subscription.seatCount,
      subscription.plan.maxEmployees,
    );

    return {
      used,
      limit,
      percentage: limit === 0 ? 100 : Math.round((used / limit) * 100),
      subscriptionId: subscription.id,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    };
  }

  async lockAndAssertCapacity(
    tx: PrismaTransaction,
    tenantId: string,
    requestedEmployees = 1,
  ) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
    const quota = await this.getSnapshot(tx, tenantId);

    if (quota.used + requestedEmployees > quota.limit) {
      throw new ConflictException({
        code: 'EMPLOYEE_QUOTA_REACHED',
        message: 'The employee quota for this workspace has been reached',
        details: this.toResponse(quota),
      });
    }

    return quota;
  }

  async emitThresholdEvents(
    tx: PrismaTransaction,
    tenantId: string,
    quotaBeforeWrite: EmployeeQuotaSnapshot,
  ) {
    const quota = {
      ...quotaBeforeWrite,
      used: quotaBeforeWrite.used + 1,
      percentage:
        quotaBeforeWrite.limit === 0
          ? 100
          : Math.round(
              ((quotaBeforeWrite.used + 1) / quotaBeforeWrite.limit) * 100,
            ),
    };

    for (const threshold of [95, 100]) {
      if (quota.percentage < threshold) continue;

      const existingEvents = await tx.outboxEvent.findMany({
        where: {
          tenantId,
          eventKey: 'organization.quota.threshold_reached',
        },
        select: { payload: true },
      });
      const alreadyEmitted = existingEvents.some(({ payload }) => {
        if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
          return false;
        }
        const value = payload as Record<string, unknown>;
        return (
          value.subscriptionId === quota.subscriptionId &&
          value.periodStart === quota.periodStart.toISOString().slice(0, 10) &&
          value.threshold === threshold
        );
      });

      if (!alreadyEmitted) {
        await this.outboxService.append(tx, {
          tenantId,
          eventKey: 'organization.quota.threshold_reached',
          payload: {
            subscriptionId: quota.subscriptionId,
            periodStart: quota.periodStart.toISOString().slice(0, 10),
            periodEnd: quota.periodEnd.toISOString().slice(0, 10),
            threshold,
            used: quota.used,
            limit: quota.limit,
            percentage: quota.percentage,
          },
        });
      }
    }
  }

  toResponse(quota: EmployeeQuotaSnapshot) {
    return {
      used: quota.used,
      limit: quota.limit,
      percentage: quota.percentage,
    };
  }
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

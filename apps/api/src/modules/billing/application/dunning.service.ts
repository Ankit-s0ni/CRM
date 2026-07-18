import { Injectable } from '@nestjs/common';
import {
  DunningAction,
  DunningState,
  Prisma,
  SubscriptionStatus,
  TenantStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { OutboxService } from '../../../shared/events/outbox.service';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../../platform/platform-auth/platform-database.service';
import { PlatformTenantsService } from '../../platform/tenants/platform-tenants.service';

@Injectable()
export class DunningService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly tenants: PlatformTenantsService,
    private readonly outbox: OutboxService,
  ) {}

  paymentFailed(invoiceId: string, sourceEventId: string, reason: string) {
    return this.database.transaction(async (tx) => {
      const invoice = await tx.tenantInvoice.findUnique({
        where: { id: invoiceId },
        include: { subscription: true },
      });
      if (!invoice || invoice.status === 'PAID') {
        return { ignored: true, reason: 'invoice_missing_or_already_paid' };
      }
      const subscription = invoice.subscription;
      const idempotencyKey = `payment-failed:${sourceEventId}`;
      const replay = await tx.dunningTransition.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: invoice.tenantId,
            idempotencyKey,
          },
        },
      });
      if (replay) return { replayed: true, transition: replay };
      const fromState = subscription.dunningState;
      const toState =
        fromState === DunningState.NONE ? DunningState.REMINDED : fromState;
      const transition = await tx.dunningTransition.create({
        data: {
          tenantId: invoice.tenantId,
          subscriptionId: subscription.id,
          action: DunningAction.PAYMENT_FAILED,
          fromState,
          toState,
          idempotencyKey,
          reason,
          scheduledFor: addHours(
            new Date(),
            Number(process.env.DUNNING_REMINDER_HOURS ?? 24),
          ),
          completedAt: new Date(),
          metadata: { invoiceId, sourceEventId },
        },
      });
      await Promise.all([
        tx.tenantSubscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.PAST_DUE,
            dunningState: toState,
          },
        }),
        this.record(tx, invoice.tenantId, 'billing.payment.failed', {
          invoiceId,
          subscriptionId: subscription.id,
          sourceEventId,
          fromState,
          toState,
        }),
      ]);
      return { replayed: false, transition };
    });
  }

  async paymentRecovered(
    invoiceId: string,
    sourceEventId: string,
    reason = 'Payment succeeded',
  ) {
    const result = await this.database.transaction(async (tx) => {
      const invoice = await tx.tenantInvoice.findUnique({
        where: { id: invoiceId },
        include: { subscription: true, tenant: true },
      });
      if (!invoice) return null;
      const subscription = invoice.subscription;
      const idempotencyKey = `payment-recovered:${sourceEventId}`;
      const replay = await tx.dunningTransition.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: invoice.tenantId,
            idempotencyKey,
          },
        },
      });
      if (replay) {
        return {
          tenantId: invoice.tenantId,
          tenantStatus: invoice.tenant.status,
          replayed: true,
        };
      }
      await tx.dunningTransition.create({
        data: {
          tenantId: invoice.tenantId,
          subscriptionId: subscription.id,
          action: DunningAction.PAYMENT_RECOVERED,
          fromState: subscription.dunningState,
          toState: DunningState.NONE,
          idempotencyKey,
          reason,
          completedAt: new Date(),
          metadata: { invoiceId, sourceEventId },
        },
      });
      await Promise.all([
        tx.tenantSubscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            dunningState: DunningState.NONE,
          },
        }),
        this.record(tx, invoice.tenantId, 'billing.payment.recovered', {
          invoiceId,
          subscriptionId: subscription.id,
          sourceEventId,
        }),
      ]);
      return {
        tenantId: invoice.tenantId,
        tenantStatus: invoice.tenant.status,
        replayed: false,
      };
    });
    if (result?.tenantStatus === TenantStatus.SUSPENDED) {
      await this.tenants.billingReactivate(
        result.tenantId,
        reason,
        `billing-recovery:${sourceEventId}`,
      );
    }
    return result;
  }

  async advance(subscriptionId: string, source = 'scheduler') {
    const result = await this.database.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tenant_subscriptions WHERE id = ${subscriptionId}::uuid FOR UPDATE`;
      const subscription = await tx.tenantSubscription.findUnique({
        where: { id: subscriptionId },
        include: { tenant: true },
      });
      if (!subscription || subscription.dunningState === DunningState.NONE)
        return null;
      const state = nextState(subscription.dunningState);
      const idempotencyKey = `${state.action.toLowerCase()}:${subscription.id}:${subscription.dunningState}`;
      const replay = await tx.dunningTransition.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: subscription.tenantId,
            idempotencyKey,
          },
        },
      });
      if (replay) return { subscription, state, replayed: true };
      const transition = await tx.dunningTransition.create({
        data: {
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          action: state.action,
          fromState: subscription.dunningState,
          toState: state.toState,
          idempotencyKey,
          reason: state.reason,
          scheduledFor: state.nextHours
            ? addHours(new Date(), state.nextHours)
            : null,
          completedAt: new Date(),
          metadata: { source },
        },
      });
      await Promise.all([
        tx.tenantSubscription.update({
          where: { id: subscription.id },
          data: {
            dunningState: state.toState,
            status:
              state.action === DunningAction.TENANT_SUSPENDED
                ? SubscriptionStatus.SUSPENDED
                : SubscriptionStatus.PAST_DUE,
          },
        }),
        this.record(tx, subscription.tenantId, 'billing.dunning.advanced', {
          subscriptionId,
          action: state.action,
          fromState: subscription.dunningState,
          toState: state.toState,
        }),
      ]);
      return { subscription, state, transition, replayed: false };
    });
    if (result?.state.action === DunningAction.TENANT_SUSPENDED) {
      await this.tenants.billingSuspend(
        result.subscription.tenantId,
        'Payment remained unpaid after the billing grace period',
        `dunning:${result.subscription.id}`,
      );
    }
    return result;
  }

  async runDue() {
    const due = await this.database.transaction((tx) =>
      tx.dunningTransition.findMany({
        where: {
          scheduledFor: { lte: new Date() },
          completedAt: { not: null },
          subscription: {
            status: { in: [SubscriptionStatus.PAST_DUE] },
          },
        },
        distinct: ['subscriptionId'],
        orderBy: { createdAt: 'desc' },
        select: { subscriptionId: true },
      }),
    );
    const outcomes: Array<unknown> = [];
    for (const item of due)
      outcomes.push(await this.advance(item.subscriptionId));
    return outcomes;
  }

  private record(
    tx: PlatformTransaction,
    tenantId: string,
    eventKey: string,
    payload: Record<string, unknown>,
  ) {
    return Promise.all([
      this.outbox.append(tx, {
        tenantId,
        eventKey,
        payload: payload as Prisma.InputJsonValue,
      }),
      tx.systemAuditLog.create({
        data: {
          tenantId,
          action: eventKey,
          module: 'platform.billing',
          newValue: payload as Prisma.InputJsonValue,
          requestId: randomUUID(),
        },
      }),
      tx.tenantAuditLog.create({
        data: {
          tenantId,
          action: eventKey,
          module: 'billing',
          newValue: payload as Prisma.InputJsonValue,
        },
      }),
    ]);
  }
}

function nextState(state: DunningState) {
  if (state === DunningState.REMINDED) {
    return {
      action: DunningAction.GRACE_STARTED,
      toState: DunningState.GRACE,
      reason: 'Reminder elapsed; grace period started',
      nextHours: Number(process.env.DUNNING_GRACE_HOURS ?? 72),
    };
  }
  if (state === DunningState.GRACE) {
    return {
      action: DunningAction.SUSPEND_SCHEDULED,
      toState: DunningState.SUSPEND_PENDING,
      reason: 'Grace period elapsed; suspension pending',
      nextHours: Number(process.env.DUNNING_SUSPEND_PENDING_HOURS ?? 24),
    };
  }
  return {
    action: DunningAction.TENANT_SUSPENDED,
    toState: DunningState.SUSPEND_PENDING,
    reason: 'Suspension deadline elapsed',
    nextHours: 0,
  };
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + Math.max(0, hours) * 3_600_000);
}

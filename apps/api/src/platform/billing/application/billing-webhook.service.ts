import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentGateway,
  PaymentStatus,
  Prisma,
  WebhookReceiptStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { OutboxService } from '../../../shared/events/outbox.service';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../../../shared/database/platform-database.service';
import { minorToMajor } from '../domain/billing-money';
import { PaymentProviderRegistry } from '../infrastructure/payment-providers';
import type { NormalizedPaymentEvent } from '../infrastructure/payment-provider.port';
import { DunningService } from './dunning.service';

@Injectable()
export class BillingWebhookService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly providers: PaymentProviderRegistry,
    private readonly dunning: DunningService,
    private readonly outbox: OutboxService,
  ) {}

  async handle(
    provider: PaymentGateway,
    rawBody: Buffer,
    signature: string | undefined,
    eventIdHeader?: string,
  ) {
    const adapter = this.providers.get(provider);
    adapter.verify(rawBody, signature);
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as unknown;
    } catch {
      throw new UnprocessableEntityException({
        code: 'WEBHOOK_PAYLOAD_INVALID',
        message: 'Payment webhook body is not valid JSON',
      });
    }
    const event = adapter.normalize(payload, eventIdHeader);
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const claimed = await this.claim(event, payloadHash);
    if (claimed.replayed) return { data: claimed.outcome, replayed: true };
    const outcome = await this.process(event);
    await this.database.transaction((tx) =>
      tx.billingWebhookReceipt.update({
        where: { id: claimed.receiptId },
        data: {
          status: WebhookReceiptStatus.PROCESSED,
          processedAt: new Date(),
          outcome: outcome,
        },
      }),
    );
    if (outcome.invoiceId && event.status === PaymentStatus.FAILED) {
      await this.dunning.paymentFailed(
        outcome.invoiceId,
        event.eventId,
        event.failureReason ?? 'Payment failed',
      );
    }
    if (outcome.invoiceId && event.status === PaymentStatus.SUCCEEDED) {
      await this.dunning.paymentRecovered(outcome.invoiceId, event.eventId);
    }
    return { data: outcome, replayed: false };
  }

  private async claim(event: NormalizedPaymentEvent, payloadHash: string) {
    try {
      return await this.database.transaction(async (tx) => {
        const existing = await tx.billingWebhookReceipt.findUnique({
          where: {
            provider_providerEventId: {
              provider: event.provider,
              providerEventId: event.eventId,
            },
          },
        });
        if (existing) return this.replay(existing, payloadHash);
        const receipt = await tx.billingWebhookReceipt.create({
          data: {
            provider: event.provider,
            providerEventId: event.eventId,
            eventType: event.eventType,
            occurredAt: event.occurredAt,
            payloadHash,
            status: WebhookReceiptStatus.PROCESSING,
            attemptCount: 1,
            normalizedEvent: serializableEvent(event),
          },
        });
        return { receiptId: receipt.id, replayed: false as const };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.database.transaction((tx) =>
          tx.billingWebhookReceipt.findUniqueOrThrow({
            where: {
              provider_providerEventId: {
                provider: event.provider,
                providerEventId: event.eventId,
              },
            },
          }),
        );
        return this.replay(existing, payloadHash);
      }
      throw error;
    }
  }

  private replay(
    existing: {
      id: string;
      payloadHash: string;
      outcome: Prisma.JsonValue | null;
    },
    payloadHash: string,
  ) {
    if (existing.payloadHash !== payloadHash) {
      throw new ConflictException({
        code: 'WEBHOOK_EVENT_CONFLICT',
        message: 'Provider event ID was reused with another payload',
      });
    }
    return {
      receiptId: existing.id,
      replayed: true as const,
      outcome: existing.outcome ?? { status: 'processing' },
    };
  }

  private process(event: NormalizedPaymentEvent) {
    return this.database.transaction(async (tx) => {
      if (!event.invoiceId) {
        return { status: 'ignored', reason: 'invoice_id_missing' };
      }
      const invoice = await tx.tenantInvoice.findUnique({
        where: { id: event.invoiceId },
        include: { subscription: true },
      });
      if (!invoice) {
        return {
          status: 'ignored',
          reason: 'invoice_not_found',
          invoiceId: event.invoiceId,
        };
      }
      const idempotencyKey = `webhook:${event.provider}:${event.eventId}`;
      const transaction = await tx.paymentTransaction.upsert({
        where: {
          tenantId_idempotencyKey: {
            tenantId: invoice.tenantId,
            idempotencyKey,
          },
        },
        update: {},
        create: {
          tenantId: invoice.tenantId,
          invoiceId: invoice.id,
          gateway: event.provider,
          gatewayRef: event.gatewayRef,
          amount: minorToMajor(event.amountMinor, invoice.currency),
          currency: event.currency,
          status: event.status,
          failureReason: event.failureReason,
          providerEventId: event.eventId,
          idempotencyKey,
          metadata: { eventType: event.eventType },
        },
      });
      let invoiceStatus = invoice.status;
      let ignoredOutOfOrder = false;
      if (event.status === PaymentStatus.SUCCEEDED) {
        invoiceStatus = InvoiceStatus.PAID;
        await tx.tenantInvoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.PAID,
            amountDue: 0,
            paidAt: new Date(),
          },
        });
      } else if (
        event.status === PaymentStatus.FAILED &&
        invoice.status === InvoiceStatus.PAID
      ) {
        ignoredOutOfOrder = true;
      }
      await Promise.all([
        this.outbox.append(tx, {
          tenantId: invoice.tenantId,
          eventKey:
            event.status === PaymentStatus.SUCCEEDED
              ? 'billing.payment.succeeded'
              : event.status === PaymentStatus.FAILED
                ? 'billing.payment.failed'
                : 'billing.payment.updated',
          payload: {
            tenantId: invoice.tenantId,
            invoiceId: invoice.id,
            transactionId: transaction.id,
            provider: event.provider,
            providerEventId: event.eventId,
            status: event.status,
            ignoredOutOfOrder,
          },
        }),
        this.audit(tx, invoice.tenantId, event, transaction.id, invoiceStatus),
      ]);
      return {
        status: 'processed',
        invoiceId: invoice.id,
        transactionId: transaction.id,
        paymentStatus: event.status,
        invoiceStatus,
        ignoredOutOfOrder,
      };
    });
  }

  private audit(
    tx: PlatformTransaction,
    tenantId: string,
    event: NormalizedPaymentEvent,
    transactionId: string,
    invoiceStatus: InvoiceStatus,
  ) {
    const evidence = {
      provider: event.provider,
      providerEventId: event.eventId,
      eventType: event.eventType,
      transactionId,
      paymentStatus: event.status,
      invoiceStatus,
    };
    return Promise.all([
      tx.systemAuditLog.create({
        data: {
          tenantId,
          action: 'platform.billing.webhook.processed',
          module: 'platform.billing',
          newValue: evidence,
          requestId: event.eventId,
        },
      }),
      tx.tenantAuditLog.create({
        data: {
          tenantId,
          action: 'billing.webhook.processed',
          module: 'billing',
          entityType: 'PaymentTransaction',
          entityId: transactionId,
          newValue: evidence,
        },
      }),
    ]);
  }
}

function serializableEvent(event: NormalizedPaymentEvent) {
  return {
    ...event,
    occurredAt: event.occurredAt.toISOString(),
    amountMinor: event.amountMinor.toString(),
  } as Prisma.InputJsonValue;
}

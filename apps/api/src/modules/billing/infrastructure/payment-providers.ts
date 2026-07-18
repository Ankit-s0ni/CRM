import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentGateway, PaymentStatus } from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type {
  NormalizedPaymentEvent,
  PaymentProviderPort,
  ProviderChargeRequest,
  ProviderChargeResult,
} from './payment-provider.port';

@Injectable()
export class RazorpayProvider implements PaymentProviderPort {
  readonly provider = PaymentGateway.RAZORPAY;

  verify(rawBody: Buffer, signature: string | undefined) {
    verifyHmac(
      rawBody,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET,
      'WEBHOOK_SIGNATURE_INVALID',
    );
  }

  normalize(payload: unknown, eventIdHeader?: string): NormalizedPaymentEvent {
    const root = record(payload);
    const payment = record(record(record(root.payload).payment).entity);
    const eventType = text(root.event);
    const eventId = eventIdHeader || text(root.id) || text(payment.id);
    if (!eventId || !eventType) invalidEvent();
    const status = providerStatus(text(payment.status), eventType);
    return {
      provider: this.provider,
      eventId,
      eventType,
      occurredAt: new Date(number(root.created_at, Date.now() / 1000) * 1000),
      invoiceId: optionalText(record(payment.notes).invoiceId),
      gatewayRef: optionalText(payment.id),
      amountMinor: BigInt(Math.max(0, number(payment.amount, 0))),
      currency: (optionalText(payment.currency) ?? 'INR').toUpperCase(),
      status,
      failureReason:
        optionalText(payment.error_description) ??
        optionalText(payment.error_reason),
    };
  }

  charge(request: ProviderChargeRequest) {
    return chargeGateway(
      process.env.RAZORPAY_CHARGE_URL,
      process.env.RAZORPAY_API_KEY,
      this.provider,
      request,
    );
  }

  health() {
    return providerHealth(process.env.RAZORPAY_HEALTH_URL);
  }
}

@Injectable()
export class StripeProvider implements PaymentProviderPort {
  readonly provider = PaymentGateway.STRIPE;

  verify(rawBody: Buffer, signature: string | undefined) {
    const parts = new Map<string, string>();
    for (const part of (signature ?? '').split(',')) {
      const separator = part.indexOf('=');
      if (separator > 0) {
        parts.set(part.slice(0, separator), part.slice(separator + 1));
      }
    }
    const timestamp = Number(parts.get('t'));
    if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300)
      invalidSignature();
    verifyHmac(
      Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]),
      parts.get('v1'),
      process.env.STRIPE_WEBHOOK_SECRET,
      'WEBHOOK_SIGNATURE_INVALID',
    );
  }

  normalize(payload: unknown): NormalizedPaymentEvent {
    const root = record(payload);
    const object = record(record(root.data).object);
    const eventType = text(root.type);
    const eventId = text(root.id);
    if (!eventId || !eventType) invalidEvent();
    const status = providerStatus(text(object.status), eventType);
    return {
      provider: this.provider,
      eventId,
      eventType,
      occurredAt: new Date(number(root.created, Date.now() / 1000) * 1000),
      invoiceId: optionalText(record(object.metadata).invoiceId),
      gatewayRef: optionalText(object.id),
      amountMinor: BigInt(
        Math.max(0, number(object.amount_received, number(object.amount, 0))),
      ),
      currency: (optionalText(object.currency) ?? 'INR').toUpperCase(),
      status,
      failureReason:
        optionalText(record(object.last_payment_error).message) ?? null,
    };
  }

  charge(request: ProviderChargeRequest) {
    return chargeGateway(
      process.env.STRIPE_CHARGE_URL,
      process.env.STRIPE_API_KEY,
      this.provider,
      request,
    );
  }

  health() {
    return providerHealth(process.env.STRIPE_HEALTH_URL);
  }
}

@Injectable()
export class PaymentProviderRegistry {
  constructor(
    private readonly razorpay: RazorpayProvider,
    private readonly stripe: StripeProvider,
  ) {}

  get(provider: PaymentGateway): PaymentProviderPort {
    return provider === PaymentGateway.RAZORPAY ? this.razorpay : this.stripe;
  }

  health() {
    return Promise.all([
      this.razorpay.health().then((health) => ({
        provider: PaymentGateway.RAZORPAY,
        ...health,
      })),
      this.stripe.health().then((health) => ({
        provider: PaymentGateway.STRIPE,
        ...health,
      })),
    ]);
  }
}

function verifyHmac(
  body: Buffer,
  signature: string | undefined,
  secret: string | undefined,
  code: string,
) {
  if (!secret || !signature) invalidSignature(code);
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(signature, 'hex');
  if (left.length !== right.length || !timingSafeEqual(left, right))
    invalidSignature(code);
}

async function chargeGateway(
  url: string | undefined,
  apiKey: string | undefined,
  provider: PaymentGateway,
  request: ProviderChargeRequest,
): Promise<ProviderChargeResult> {
  if (process.env.NODE_ENV === 'test' && !url) {
    return {
      gatewayRef: `test_${provider.toLowerCase()}_${randomUUID()}`,
      status: request.providerMethodRef.includes('fail')
        ? PaymentStatus.FAILED
        : PaymentStatus.SUCCEEDED,
      failureReason: request.providerMethodRef.includes('fail')
        ? 'Test payment declined'
        : undefined,
    };
  }
  if (!url || !apiKey) {
    return {
      gatewayRef: `unconfigured_${randomUUID()}`,
      status: PaymentStatus.FAILED,
      failureReason: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
    };
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': request.idempotencyKey,
      },
      body: JSON.stringify({
        amount: request.amountMinor.toString(),
        currency: request.currency,
        paymentMethod: request.providerMethodRef,
        invoiceId: request.invoiceId,
      }),
      signal: AbortSignal.timeout(providerTimeoutMs()),
    });
  } catch (error) {
    return {
      gatewayRef: `${provider.toLowerCase()}_unreachable_${randomUUID()}`,
      status: PaymentStatus.FAILED,
      failureReason:
        error instanceof DOMException && error.name === 'TimeoutError'
          ? 'PAYMENT_PROVIDER_TIMEOUT'
          : 'PAYMENT_PROVIDER_UNREACHABLE',
    };
  }
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return {
    gatewayRef: optionalText(body.id) ?? `${provider}_${randomUUID()}`,
    status: response.ok ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
    failureReason: response.ok
      ? undefined
      : (optionalText(body.message) ?? `HTTP_${response.status}`),
  };
}

function providerTimeoutMs() {
  const configured = Number(process.env.PAYMENT_PROVIDER_TIMEOUT_MS ?? 10000);
  return Number.isFinite(configured)
    ? Math.min(60_000, Math.max(1000, configured))
    : 10_000;
}

async function providerHealth(url: string | undefined) {
  if (!url)
    return { status: 'down' as const, latencyMs: 0, detail: 'unconfigured' };
  const started = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return {
      status: response.ok ? ('up' as const) : ('down' as const),
      latencyMs: Date.now() - started,
      detail: response.ok ? undefined : `HTTP_${response.status}`,
    };
  } catch {
    return {
      status: 'down' as const,
      latencyMs: Date.now() - started,
      detail: 'unreachable',
    };
  }
}

function providerStatus(status: string, eventType: string) {
  const value = `${status} ${eventType}`.toLowerCase();
  if (/refund/.test(value)) return PaymentStatus.REFUNDED;
  if (/captured|succeed|paid/.test(value)) return PaymentStatus.SUCCEEDED;
  if (/fail|declin/.test(value)) return PaymentStatus.FAILED;
  return PaymentStatus.PENDING;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function optionalText(value: unknown) {
  const valueText = text(value).trim();
  return valueText || null;
}

function number(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function invalidSignature(code = 'WEBHOOK_SIGNATURE_INVALID'): never {
  throw new UnauthorizedException({
    code,
    message: 'Payment webhook signature is invalid',
  });
}

function invalidEvent(): never {
  throw new UnprocessableEntityException({
    code: 'WEBHOOK_PAYLOAD_INVALID',
    message: 'Payment webhook payload is missing required fields',
  });
}

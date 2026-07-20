import { PaymentGateway, PaymentStatus } from '@prisma/client';

export type NormalizedPaymentEvent = {
  provider: PaymentGateway;
  eventId: string;
  eventType: string;
  occurredAt: Date;
  invoiceId: string | null;
  gatewayRef: string | null;
  amountMinor: bigint;
  currency: string;
  status: PaymentStatus;
  failureReason: string | null;
};

export type ProviderChargeRequest = {
  amountMinor: bigint;
  currency: string;
  providerMethodRef: string;
  invoiceId: string;
  idempotencyKey: string;
};

export type ProviderChargeResult = {
  gatewayRef: string;
  status: PaymentStatus;
  failureReason?: string;
};

export interface PaymentProviderPort {
  readonly provider: PaymentGateway;
  verify(rawBody: Buffer, signature: string | undefined): void;
  normalize(payload: unknown, eventIdHeader?: string): NormalizedPaymentEvent;
  charge(request: ProviderChargeRequest): Promise<ProviderChargeResult>;
  health(): Promise<{
    status: 'up' | 'down';
    latencyMs: number;
    detail?: string;
  }>;
}

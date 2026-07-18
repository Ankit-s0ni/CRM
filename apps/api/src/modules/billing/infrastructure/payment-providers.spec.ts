import { PaymentStatus } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { RazorpayProvider, StripeProvider } from './payment-providers';

describe('payment provider adapters', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.RAZORPAY_CHARGE_URL;
    delete process.env.RAZORPAY_API_KEY;
  });

  it('verifies Razorpay against the exact raw bytes before normalization', () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'razor-secret';
    const provider = new RazorpayProvider();
    const raw = Buffer.from(
      JSON.stringify({
        id: 'evt_1',
        event: 'payment.captured',
        created_at: 1784380000,
        payload: {
          payment: {
            entity: {
              id: 'pay_1',
              status: 'captured',
              amount: 118000,
              currency: 'INR',
              notes: { invoiceId: '019f0000-0000-7000-8000-000000000001' },
            },
          },
        },
      }),
    );
    provider.verify(
      raw,
      createHmac('sha256', 'razor-secret').update(raw).digest('hex'),
    );
    expect(provider.normalize(JSON.parse(raw.toString()))).toMatchObject({
      eventId: 'evt_1',
      status: PaymentStatus.SUCCEEDED,
      amountMinor: 118000n,
    });
    expect(() => provider.verify(raw, '00')).toThrow(
      'Payment webhook signature is invalid',
    );
  });

  it('verifies Stripe timestamp signatures and maps failures', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'stripe-secret';
    const provider = new StripeProvider();
    const raw = Buffer.from(
      JSON.stringify({
        id: 'evt_2',
        type: 'payment_intent.payment_failed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'pi_2',
            status: 'requires_payment_method',
            amount: 2000,
            currency: 'inr',
            metadata: { invoiceId: '019f0000-0000-7000-8000-000000000001' },
            last_payment_error: { message: 'Declined' },
          },
        },
      }),
    );
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', 'stripe-secret')
      .update(Buffer.concat([Buffer.from(`${timestamp}.`), raw]))
      .digest('hex');
    provider.verify(raw, `t=${timestamp},v1=${signature}`);
    expect(provider.normalize(JSON.parse(raw.toString()))).toMatchObject({
      status: PaymentStatus.FAILED,
      failureReason: 'Declined',
    });
  });

  it('returns a failed charge outcome when the gateway is unreachable', async () => {
    process.env.RAZORPAY_CHARGE_URL = 'https://payments.invalid/charge';
    process.env.RAZORPAY_API_KEY = 'test-key';
    global.fetch = jest.fn().mockRejectedValue(new TypeError('network down'));

    await expect(
      new RazorpayProvider().charge({
        amountMinor: 2500n,
        currency: 'INR',
        providerMethodRef: 'pm_outage',
        invoiceId: '019f0000-0000-7000-8000-000000000001',
        idempotencyKey: 'outage-drill-1',
      }),
    ).resolves.toMatchObject({
      status: PaymentStatus.FAILED,
      failureReason: 'PAYMENT_PROVIDER_UNREACHABLE',
    });
  });
});

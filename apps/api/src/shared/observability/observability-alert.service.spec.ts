import { ObservabilityAlertService } from './observability-alert.service';

describe('ObservabilityAlertService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OBSERVABILITY_ALERT_WEBHOOK_URL =
      'https://alerts.example.com/deltcrm';
    process.env.OTEL_SERVICE_NAME = 'deltcrm-api';
    process.env.DEPLOYMENT_ENVIRONMENT = 'test';
    process.env.RELEASE_VERSION = '8.0.0-test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.OBSERVABILITY_ALERT_WEBHOOK_URL;
  });

  it('sends a PII-safe alert once per route during the deduplication window', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const alerts = new ObservabilityAlertService();

    await alerts.notifyServerError({
      requestId: 'request-1',
      path: '/billing/invoices/:id',
    });
    await alerts.notifyServerError({
      requestId: 'request-2',
      path: '/billing/invoices/:id',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, request] = (global.fetch as jest.MockedFunction<typeof fetch>).mock
      .calls[0];
    if (typeof request?.body !== 'string') {
      throw new Error('Expected an alert JSON request body');
    }
    const body = JSON.parse(request.body) as Record<string, unknown>;
    expect(body).toMatchObject({
      eventType: 'api.server_error',
      route: '/billing/invoices/:id',
      release: '8.0.0-test',
    });
    expect(JSON.stringify(body)).not.toContain('password');
  });

  it('swallows transport errors and permits a later retry', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const alerts = new ObservabilityAlertService();

    await expect(
      alerts.notifyServerError({ requestId: 'one', path: '/healthz' }),
    ).resolves.toBe('failed');
    await alerts.notifyServerError({ requestId: 'two', path: '/healthz' });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('delivers a correlated operational drill without PII fields', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const alerts = new ObservabilityAlertService();

    await expect(
      alerts.notifyOperationalAlert({
        eventType: 'ga.observability_drill',
        severity: 'warning',
        deduplicationKey: 'ga-drill:drill-123',
        summary: 'Synthetic GA observability routing drill.',
        attributes: { drillId: 'drill-123' },
      }),
    ).resolves.toBe('sent');

    const [, request] = (global.fetch as jest.MockedFunction<typeof fetch>).mock
      .calls[0];
    if (typeof request?.body !== 'string') {
      throw new Error('Expected an alert JSON request body');
    }
    expect(JSON.parse(request.body)).toMatchObject({
      eventType: 'ga.observability_drill',
      drillId: 'drill-123',
      summary: 'Synthetic GA observability routing drill.',
    });
  });
});

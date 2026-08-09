import { ProductIntegrationClient } from '@deltcrm/product-contracts/generated';

describe('ProductIntegrationClient correlation propagation', () => {
  it('adds correlation headers to user and service requests', async () => {
    const requests: RequestInit[] = [];
    const fetcher: typeof globalThis.fetch = (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      requests.push(init ?? {});
      return Promise.resolve(
        new Response(JSON.stringify({ products: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    };
    const client = new ProductIntegrationClient({
      baseUrl: 'https://platform.internal/',
      fetch: fetcher,
      serviceProductKey: 'HRMS',
      serviceKey: 'rotating-secret',
      getCorrelationContext: () => ({
        requestId: 'req-123',
        traceId: 'trace-456',
        traceparent: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
      }),
    });

    await client.entitlements();
    await client.tenantEntitlements('tenant-1');

    for (const init of requests) {
      const headers = new Headers(init.headers);
      expect(headers.get('X-Request-Id')).toBe('req-123');
      expect(headers.get('X-Trace-Id')).toBe('trace-456');
      expect(headers.get('traceparent')).toBe(
        '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
      );
    }
  });

  it('lets explicit request headers and issue-token request IDs win', async () => {
    const requests: RequestInit[] = [];
    const fetcher: typeof globalThis.fetch = (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      requests.push(init ?? {});
      return Promise.resolve(
        new Response(JSON.stringify({ token: 'token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    };
    const client = new ProductIntegrationClient({
      baseUrl: 'https://platform.internal',
      fetch: fetcher,
      getAccessToken: () => 'platform-session-token',
      getCorrelationContext: () => ({ requestId: 'ambient-request' }),
    });

    await client.issueToken('hrms-api', 'explicit-request');

    const headers = new Headers(requests[0]?.headers);
    expect(headers.get('X-Request-Id')).toBe('explicit-request');
    expect(headers.get('Authorization')).toBe('Bearer platform-session-token');
    expect(requests[0]?.body).toBe(JSON.stringify({ audience: 'hrms-api' }));
    expect(requests[0]?.body).not.toContain('password');
  });

  it('requests current identity status with service authentication', async () => {
    const requests: Array<{ input: string; init: RequestInit }> = [];
    const fetcher: typeof globalThis.fetch = (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      requests.push({ input: url, init: init ?? {} });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            tenantId: '0198a4f6-5c53-7e10-8a88-5ab48df8a93a',
            userId: '0198a4f6-5c53-7e10-8a88-5ab48df8a93b',
            membershipId: '0198a4f6-5c53-7e10-8a88-5ab48df8a93c',
            tenantStatus: 'ACTIVE',
            userStatus: 'ACTIVE',
            membershipStatus: 'ACTIVE',
            effectiveAt: '2026-08-05T00:00:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    };
    const client = new ProductIntegrationClient({
      baseUrl: 'https://platform.internal/',
      fetch: fetcher,
      serviceProductKey: 'HRMS',
      serviceKey: 'rotating-secret',
      getCorrelationContext: () => ({ requestId: 'req-identity' }),
    });

    await client.identityStatus(
      '0198a4f6-5c53-7e10-8a88-5ab48df8a93a',
      '0198a4f6-5c53-7e10-8a88-5ab48df8a93b',
      '0198a4f6-5c53-7e10-8a88-5ab48df8a93c',
    );

    expect(requests[0]?.input).toBe(
      'https://platform.internal/internal/v1/tenants/0198a4f6-5c53-7e10-8a88-5ab48df8a93a/users/0198a4f6-5c53-7e10-8a88-5ab48df8a93b/identity-status?membershipId=0198a4f6-5c53-7e10-8a88-5ab48df8a93c',
    );
    const headers = new Headers(requests[0]?.init.headers);
    expect(headers.get('X-Product-Key')).toBe('HRMS');
    expect(headers.get('X-Product-Service-Key')).toBe('rotating-secret');
    expect(headers.get('X-Request-Id')).toBe('req-identity');
  });
});

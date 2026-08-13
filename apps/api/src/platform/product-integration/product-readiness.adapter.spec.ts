import { ServiceUnavailableException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { ProductReadinessAdapter } from './product-readiness.adapter';

describe('ProductReadinessAdapter', () => {
  const user: AuthenticatedUser = {
    tenantId: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    email: 'admin@acme.test',
    roles: ['BUSINESS_ADMIN'],
  };
  const integration = {
    issueToken: jest.fn().mockResolvedValue({ accessToken: 'product-token' }),
  };
  const registry = {
    active: jest.fn().mockResolvedValue({
      productKey: 'HRMS',
      manifest: { routes: { apiPrefix: '/api/hrms/v1/' } },
      deployments: [
        {
          environment: 'test',
          internalApiBaseUrl: 'http://hrms.internal:4012/',
        },
      ],
    }),
  };
  const adapter = new ProductReadinessAdapter(
    integration as never,
    registry as never,
  );
  const originalEnvironment = process.env.DEPLOYMENT_ENVIRONMENT;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEPLOYMENT_ENVIRONMENT = 'test';
  });

  afterAll(() => {
    process.env.DEPLOYMENT_ENVIRONMENT = originalEnvironment;
    global.fetch = originalFetch;
  });

  it('uses the active registered deployment and a scoped product token', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: {
          categories: [
            {
              key: 'ORGANIZATION',
              status: 'READY',
              configuration: { departments: 1, designations: 1 },
            },
          ],
        },
      }),
    }) as typeof fetch;

    const result = await adapter.getSetupHealth(user, 'HRMS');

    expect(registry.active).toHaveBeenCalledWith('HRMS');
    expect(integration.issueToken).toHaveBeenCalledWith(user, {
      productKey: 'HRMS',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://hrms.internal:4012/api/hrms/v1/workspace/settings/health',
      expect.objectContaining({
        headers: { Authorization: 'Bearer product-token' },
      }),
    );
    expect(result.categories).toHaveLength(1);
  });

  it('returns a stable unavailable error when the product call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('provider detail'));

    await expect(adapter.getSetupHealth(user, 'HRMS')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

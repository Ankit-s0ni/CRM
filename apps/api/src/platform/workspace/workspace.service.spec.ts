import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService settings diagnostics', () => {
  it('returns only health categories allowed by the caller permissions', async () => {
    const tx = {
      tenantModule: { findMany: jest.fn().mockResolvedValue([]) },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          companyName: 'Acme Logistics',
          companyLogo: null,
        }),
      },
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({
          timezone: 'Asia/Dubai',
          locale: 'en-AE',
        }),
      },
    };
    const prisma = {
      forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new WorkspaceService(prisma as never);

    const response = await service.getSettingsHealth(
      'tenant-1',
      new Set([PERMISSIONS.SETTINGS_READ]),
    );

    expect(response.data.categories.map(({ key }) => key)).toEqual([
      'COMPANY',
      'INTEGRATIONS',
    ]);
    expect(response.data.categories[0]).toMatchObject({
      key: 'COMPANY',
      status: 'READY',
    });
  });

  it('reports provider readiness without exposing provider secrets', () => {
    const originalGatewayUrl = process.env.EMAIL_GATEWAY_URL;
    const originalGatewayToken = process.env.EMAIL_GATEWAY_TOKEN;
    process.env.EMAIL_GATEWAY_URL = 'https://email.internal.test';
    process.env.EMAIL_GATEWAY_TOKEN = 'private-token-value';

    try {
      const response = new WorkspaceService(
        {} as never,
      ).getIntegrationDiagnostics();
      const email = response.data.providers.find(({ key }) => key === 'EMAIL');

      expect(email).toMatchObject({ status: 'CONFIGURED' });
      expect(JSON.stringify(response)).not.toContain('private-token-value');
      expect(JSON.stringify(response)).not.toContain(
        'https://email.internal.test',
      );
    } finally {
      restoreEnvironment('EMAIL_GATEWAY_URL', originalGatewayUrl);
      restoreEnvironment('EMAIL_GATEWAY_TOKEN', originalGatewayToken);
    }
  });
});

function restoreEnvironment(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

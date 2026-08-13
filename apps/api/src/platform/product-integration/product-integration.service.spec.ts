import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  HRMS_CAPABILITIES,
  HRMS_PERMISSIONS,
} from '@mariya-abdul/deltcrm-product-contracts/hrms';
import { ProductIntegrationService } from './product-integration.service';

describe('ProductIntegrationService', () => {
  const tenantId = '019fa35c-df73-7709-91a1-2d95d361d4f7';
  const userId = '019fa35c-df73-7709-91a1-2d95d361d4f8';

  function harness(
    options: {
      tenantStatus?: string;
      userStatus?: string;
      active?: boolean;
      provisioningState?: string;
      sourcePermissions?: string[];
    } = {},
  ) {
    const tx = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: tenantId,
          status: options.tenantStatus ?? 'ACTIVE',
        }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: userId,
          tenantId,
          status: options.userStatus ?? 'ACTIVE',
          roles: [
            {
              role: {
                permissions: (options.sourcePermissions ?? []).map((key) => ({
                  permission: { key },
                })),
              },
            },
          ],
        }),
      },
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({ locale: 'en' }),
      },
      productProvisioningInstance: {
        findUnique: jest.fn().mockResolvedValue({
          state: options.provisioningState ?? 'ACTIVE',
          attempt: 1,
          updatedAt: new Date('2026-08-12T00:00:00.000Z'),
          failureCode: null,
        }),
      },
      systemAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const database = {
      transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const manifest = {
      schemaVersion: 2 as const,
      productKey: 'HRMS' as const,
      manifestVersion: '2.0.0',
      minimumContractVersion: '2.0.0',
      displayName: 'DeltCRM HRMS',
      description: 'Human resources management',
      audience: 'hrms-api' as const,
      routes: {
        webPath: '/{locale}/app/hrms' as const,
        apiPrefix: '/api/hrms/v1' as const,
      },
      navigation: {
        key: 'hrms',
        labelKey: 'products.hrms.name',
        iconKey: 'hrms',
      },
      permissions: [],
      capabilities: [],
      limits: [],
      lifecycle: { mode: 'EVENT' as const, consumes: [], publishes: [] },
      health: { livenessPath: '/healthz', readinessPath: '/readyz' },
      localization: { supportedLocales: ['en'], namespaces: ['hrms'] },
    };
    const registered = {
      id: '019fa35c-df73-7709-91a1-2d95d361d499',
      productKey: 'HRMS',
      audience: 'hrms-api',
      status: 'ACTIVE',
      manifest,
      activeRevision: {
        manifest,
      },
      deployments: [],
      permissions: [
        {
          key: HRMS_PERMISSIONS.EMPLOYEES_READ,
          platformPermissionAliases: ['organization.employees.read'],
          platformPermissionPrefixAliases: [],
          requiredCapabilityKeys: [HRMS_CAPABILITIES.EMPLOYEES],
          deprecated: false,
        },
        {
          key: HRMS_PERMISSIONS.EMPLOYEES_MANAGE,
          platformPermissionAliases: ['organization.employees.create'],
          platformPermissionPrefixAliases: [],
          requiredCapabilityKeys: [HRMS_CAPABILITIES.EMPLOYEES],
          deprecated: false,
        },
      ],
    };
    const registry = {
      active: jest.fn((key: string) => {
        if (key !== 'HRMS') throw new NotFoundException();
        return Promise.resolve(registered);
      }),
      byAudience: jest.fn((audience: string) => {
        if (audience !== 'hrms-api') throw new NotFoundException();
        return Promise.resolve(registered);
      }),
      list: jest.fn().mockResolvedValue([registered]),
    };
    const entitlements = {
      tenantId,
      subscriptionStatus: 'ACTIVE',
      products: [
        {
          key: 'HRMS',
          active: options.active ?? true,
          capabilities: {
            [HRMS_CAPABILITIES.EMPLOYEES]: true,
            [HRMS_CAPABILITIES.ATTENDANCE]: true,
          },
          limits: { employees: 100 },
        },
      ],
      version: 7,
      effectiveAt: '2026-08-12T00:00:00.000Z',
    };
    const entitlementResolver = {
      resolve: jest.fn().mockResolvedValue(entitlements),
    };
    const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
    const signingKeys = {
      keyId: 'test-key',
      issuer: 'https://auth.blufield.cloud',
      privateKey: 'private-key',
      jwks: jest.fn().mockReturnValue({ keys: [] }),
    };
    const service = new ProductIntegrationService(
      database as never,
      jwt as never,
      signingKeys as never,
      registry as never,
      entitlementResolver as never,
    );
    return {
      service,
      database,
      entitlementResolver,
      jwt,
      registry,
      tx,
      manifest,
    };
  }

  const user = {
    tenantId,
    userId,
    email: 'admin@example.test',
    roles: ['BUSINESS_ADMIN'],
  };

  it('resolves the active manifest from the dynamic registry', async () => {
    const { service, registry, manifest } = harness();
    await expect(service.manifest('HRMS')).resolves.toBe(manifest);
    expect(registry.active).toHaveBeenCalledWith('HRMS');
  });

  it('requires a registered product selector', async () => {
    const { service } = harness();
    await expect(service.issueToken(user, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('issues an audience-specific token from registered permissions', async () => {
    const { service, jwt, tx } = harness({
      sourcePermissions: ['organization.employees.read'],
    });
    await expect(
      service.issueToken(user, { productKey: 'HRMS' }, 'request-id'),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        products: ['HRMS'],
        permissions: [HRMS_PERMISSIONS.EMPLOYEES_READ],
        entitlementVersion: 7,
      }),
      expect.objectContaining({ audience: 'hrms-api', algorithm: 'RS256' }),
    );
    expect(tx.systemAuditLog.create).toHaveBeenCalled();
  });

  it('rejects a token when the product is not entitled', async () => {
    const { service, jwt } = harness({ active: false });
    await expect(
      service.issueToken(user, { audience: 'hrms-api' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('rejects a token for an inactive workspace identity', async () => {
    const { service } = harness({ userStatus: 'DISABLED' });
    await expect(
      service.issueToken(user, { productKey: 'HRMS' }),
    ).rejects.toMatchObject({
      response: { code: 'PRODUCT_IDENTITY_INACTIVE' },
    });
  });

  it('builds navigation from active registered products', async () => {
    const { service } = harness({
      sourcePermissions: ['organization.employees.read'],
    });
    await expect(service.navigation(user)).resolves.toEqual({
      items: [
        { key: 'home', hrefTemplate: '/{locale}/app' },
        {
          key: 'hrms',
          hrefTemplate: '/{locale}/app/hrms',
          requiredProduct: 'HRMS',
        },
      ],
    });
  });

  it('keeps identity queries tenant-scoped', async () => {
    const { service, tx } = harness();
    await service.getIdentityStatus({ tenantId, userId, membershipId: userId });
    expect(tx.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: userId, tenantId } }),
    );
  });

  it('returns provisioning state from the Platform database', async () => {
    const { service, tx } = harness({ provisioningState: 'ACTIVE' });
    await expect(
      service.getProvisioningStatus(tenantId, 'HRMS'),
    ).resolves.toEqual({
      tenantId,
      productKey: 'HRMS',
      state: 'ACTIVE',
      attempt: 1,
      updatedAt: '2026-08-12T00:00:00.000Z',
      failureCode: undefined,
    });
    expect(tx.productProvisioningInstance.findUnique).toHaveBeenCalled();
  });

  it('delegates entitlement resolution to the dynamic resolver', async () => {
    const { service, entitlementResolver } = harness();
    await service.getEntitlements(tenantId);
    expect(entitlementResolver.resolve).toHaveBeenCalledWith(tenantId);
  });
});

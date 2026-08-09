import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  HRMS_CAPABILITIES,
  HRMS_PERMISSIONS,
} from '@deltcrm/product-contracts/hrms';
import { ProductIntegrationService } from './product-integration.service';

describe('ProductIntegrationService', () => {
  const tenantId = '019fa35c-df73-7709-91a1-2d95d361d4f7';
  const userId = '019fa35c-df73-7709-91a1-2d95d361d4f8';

  function harness(
    options: {
      tenantStatus?: string;
      moduleKeys?: string[];
      capabilityKeys?: string[];
      subscriptionStatus?: string;
      permissions?: string[];
      outbox?: Record<string, unknown> | null;
      userStatus?: string;
      userExists?: boolean;
    } = {},
  ) {
    const tenant = {
      findUnique: jest.fn().mockResolvedValue({
        id: tenantId,
        status: options.tenantStatus ?? 'ACTIVE',
        settings: { runtimeConfigVersion: 7 },
      }),
    };
    const tenantModule = {
      findMany: jest.fn().mockResolvedValue(
        (options.moduleKeys ?? ['ATTENDANCE']).map((key) => ({
          module: { key },
        })),
      ),
    };
    const tenantSubscription = {
      findFirst: jest.fn().mockResolvedValue({
        status: options.subscriptionStatus ?? 'ACTIVE',
        plan: {
          maxEmployees: 100,
          capabilities: (options.capabilityKeys ?? ['ATTENDANCE_CORE']).map(
            (key) => ({ included: true, capability: { key } }),
          ),
        },
      }),
    };
    const tenantCapabilityOverride = {
      findMany: jest.fn().mockResolvedValue([]),
    };
    const tenantSettings = {
      findUnique: jest.fn().mockResolvedValue({ locale: 'en' }),
    };
    const provisioningQueries: unknown[] = [];
    const outboxEvent = {
      findFirst: jest.fn().mockImplementation((query: unknown) => {
        provisioningQueries.push(query);
        return Promise.resolve(options.outbox ?? null);
      }),
    };
    const user = {
      findFirst: jest.fn().mockImplementation((query: unknown) => {
        const where = (query as { where?: { tenantId?: string } }).where;
        if (options.userExists === false || where?.tenantId !== tenantId) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: userId,
          tenantId,
          status: options.userStatus ?? 'ACTIVE',
          roles: [
            {
              role: {
                permissions: (options.permissions ?? []).map((key) => ({
                  permission: { key },
                })),
              },
            },
          ],
        });
      }),
      findUnique: jest.fn().mockResolvedValue({
        roles: [
          {
            role: {
              permissions: (options.permissions ?? []).map((key) => ({
                permission: { key },
              })),
            },
          },
        ],
      }),
    };
    const tenantAuditLog = { create: jest.fn().mockResolvedValue({}) };
    const tx = {
      tenant,
      tenantModule,
      tenantSubscription,
      tenantCapabilityOverride,
      tenantSettings,
      outboxEvent,
      user,
      tenantAuditLog,
    };
    const prisma = {
      forAdmin: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const jwt = { sign: jest.fn().mockReturnValue('signed-token') };
    const signingKeys = {
      keyId: 'test-key',
      issuer: 'https://auth.blufield.cloud',
      privateKey: 'private-key',
      publicKey: 'public-key',
      jwks: jest.fn().mockReturnValue({ keys: [] }),
    };
    const service = new ProductIntegrationService(
      prisma as never,
      jwt as never,
      signingKeys as never,
    );
    return { service, prisma, jwt, tx, provisioningQueries };
  }

  it('rejects an unregistered product key', () => {
    expect(() => harness().service.manifest('MAIL')).toThrow(NotFoundException);
  });

  it('maps Attendance and Payroll into one HRMS entitlement', async () => {
    const { service } = harness({
      moduleKeys: ['ATTENDANCE'],
      capabilityKeys: ['ATTENDANCE_CORE', 'ATTENDANCE_LEAVE'],
    });
    const contract = await service.getEntitlements(tenantId);
    const hrms = contract.products[0];

    expect(hrms).toMatchObject({
      key: 'HRMS',
      active: true,
      limits: { employees: 100 },
      capabilities: {
        [HRMS_CAPABILITIES.EMPLOYEES]: true,
        [HRMS_CAPABILITIES.ATTENDANCE]: true,
        [HRMS_CAPABILITIES.LEAVE]: true,
        [HRMS_CAPABILITIES.PAYROLL]: false,
      },
    });
  });

  it('removes all product access when the tenant is suspended', async () => {
    const { service } = harness({
      tenantStatus: 'SUSPENDED',
      moduleKeys: ['ATTENDANCE', 'PAYROLL'],
      capabilityKeys: ['ATTENDANCE_CORE', 'ATTENDANCE_LEAVE'],
    });
    const contract = await service.getEntitlements(tenantId);

    expect(contract.subscriptionStatus).toBe('SUSPENDED');
    expect(contract.products[0].active).toBe(false);
    expect(Object.values(contract.products[0].capabilities)).not.toContain(
      true,
    );
  });

  it('does not expose HRMS navigation without an HRMS permission', async () => {
    const { service } = harness({ permissions: [] });
    await expect(
      service.navigation({
        tenantId,
        userId,
        email: 'employee@example.test',
        roles: ['EMPLOYEE'],
      }),
    ).resolves.toEqual({
      items: [{ key: 'home', hrefTemplate: '/{locale}/app' }],
    });
  });

  it('does not grant employee management from read-only permissions', async () => {
    const { service, jwt } = harness({
      permissions: [
        'organization.employees.read',
        'organization.employees.reports.read',
      ],
    });

    await service.issueToken(
      {
        tenantId,
        userId,
        email: 'manager@example.test',
        roles: ['MANAGER'],
      },
      'hrms-api',
    );

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: [HRMS_PERMISSIONS.EMPLOYEES_READ],
        locale: 'en',
        entitlementVersion: 7,
      }),
      expect.any(Object),
    );
  });

  it('grants employee management from an explicit write permission', async () => {
    const { service, jwt } = harness({
      permissions: ['organization.employees.create'],
    });

    await service.issueToken(
      {
        tenantId,
        userId,
        email: 'hr@example.test',
        roles: ['HR_ADMIN'],
      },
      'hrms-api',
    );

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: [HRMS_PERMISSIONS.EMPLOYEES_MANAGE],
      }),
      expect.any(Object),
    );
  });

  it('maps employee attendance self-service without granting admin access', async () => {
    const { service, jwt } = harness({
      permissions: [
        'attendance.records.self.read',
        'attendance.records.self.write',
      ],
    });

    await service.issueToken(
      {
        tenantId,
        userId,
        email: 'employee@example.test',
        roles: ['EMPLOYEE'],
      },
      'hrms-api',
    );

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: [
          HRMS_PERMISSIONS.ATTENDANCE_SELF_READ,
          HRMS_PERMISSIONS.ATTENDANCE_SELF_WRITE,
          HRMS_PERMISSIONS.DEVICES_SELF_READ,
          HRMS_PERMISSIONS.DEVICES_SELF_WRITE,
        ],
      }),
      expect.any(Object),
    );
  });

  it('maps device review and management without relying on HRMS role names', async () => {
    const { service, jwt } = harness({
      permissions: ['attendance.devices.read', 'attendance.devices.manage'],
    });

    await service.issueToken(
      {
        tenantId,
        userId,
        email: 'hr@example.test',
        roles: ['HR_ADMIN'],
      },
      'hrms-api',
    );

    const claims = firstCallArg<{ permissions: string[] }>(jwt.sign);
    expect(claims.permissions).toContain(HRMS_PERMISSIONS.DEVICES_READ);
    expect(claims.permissions).toContain(HRMS_PERMISSIONS.DEVICES_MANAGE);
  });

  it('maps leave self-service without granting reviewer or admin access', async () => {
    const { service, jwt } = harness({ permissions: ['leave.self'] });

    await service.issueToken(
      {
        tenantId,
        userId,
        email: 'employee@example.test',
        roles: ['EMPLOYEE'],
      },
      'hrms-api',
    );

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: [
          HRMS_PERMISSIONS.LEAVE_SELF_READ,
          HRMS_PERMISSIONS.LEAVE_SELF_WRITE,
        ],
      }),
      expect.any(Object),
    );
  });

  it('maps leave approval separately from leave administration', async () => {
    const { service, jwt } = harness({ permissions: ['leave.approve'] });

    await service.issueToken(
      {
        tenantId,
        userId,
        email: 'manager@example.test',
        roles: ['MANAGER'],
      },
      'hrms-api',
    );

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: [
          HRMS_PERMISSIONS.LEAVE_READ,
          HRMS_PERMISSIONS.LEAVE_APPROVE,
        ],
      }),
      expect.any(Object),
    );
  });

  it('maps leave administration to read, manage, and approve', async () => {
    const { service, jwt } = harness({ permissions: ['leave.manage'] });

    await service.issueToken(
      {
        tenantId,
        userId,
        email: 'hr@example.test',
        roles: ['HR_ADMIN'],
      },
      'hrms-api',
    );

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: [
          HRMS_PERMISSIONS.LEAVE_READ,
          HRMS_PERMISSIONS.LEAVE_MANAGE,
          HRMS_PERMISSIONS.LEAVE_APPROVE,
        ],
      }),
      expect.any(Object),
    );
  });

  it('does not issue a product token when HRMS is disabled', async () => {
    const { service, jwt } = harness({ moduleKeys: [] });
    await expect(
      service.issueToken(
        {
          tenantId,
          userId,
          email: 'admin@example.test',
          roles: ['BUSINESS_ADMIN'],
        },
        'hrms-api',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('does not issue a product token for a disabled user', async () => {
    const { service, jwt } = harness({ userStatus: 'DISABLED' });
    let error: unknown;
    try {
      await service.issueToken(
        {
          tenantId,
          userId,
          email: 'disabled@example.test',
          roles: ['BUSINESS_ADMIN'],
        },
        'hrms-api',
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: 'PRODUCT_IDENTITY_INACTIVE',
    });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('returns unavailable membership for a mismatched membership id', async () => {
    const { service } = harness();

    await expect(
      service.getIdentityStatus({
        tenantId,
        userId,
        membershipId: '019fa35c-df73-7709-91a1-2d95d361d40',
      }),
    ).resolves.toMatchObject({
      tenantStatus: 'ACTIVE',
      userStatus: 'ACTIVE',
      membershipStatus: 'UNAVAILABLE',
    });
  });

  it('does not resolve a user outside the requested tenant boundary', async () => {
    const { service, tx } = harness();
    const otherTenantId = '019fa35c-df73-7709-91a1-2d95d361d40';

    await expect(
      service.getIdentityStatus({
        tenantId: otherTenantId,
        userId,
        membershipId: userId,
      }),
    ).resolves.toMatchObject({
      userStatus: 'UNAVAILABLE',
      membershipStatus: 'UNAVAILABLE',
    });
    expect(tx.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId, tenantId: otherTenantId },
      }),
    );
  });

  it('uses only the requested tenant in entitlement persistence queries', async () => {
    const { service, tx } = harness();
    await service.getEntitlements(tenantId);

    expect(tx.tenant.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: tenantId } }),
    );
    expect(tx.tenantModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId, isActive: true } }),
    );
    expect(tx.tenantSubscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId } }),
    );
    expect(tx.tenantCapabilityOverride.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId } }),
    );
  });

  it('reads fresh entitlements after a product is disabled', async () => {
    const { service, tx } = harness({ moduleKeys: ['ATTENDANCE'] });
    tx.tenantModule.findMany
      .mockResolvedValueOnce([{ module: { key: 'ATTENDANCE' } }])
      .mockResolvedValueOnce([]);

    const enabled = await service.getEntitlements(tenantId);
    const disabled = await service.getEntitlements(tenantId);

    expect(enabled.products[0].active).toBe(true);
    expect(disabled.products[0].active).toBe(false);
    expect(tx.tenantModule.findMany).toHaveBeenCalledTimes(2);
  });

  it('exposes durable delivery attempts and dead-letter failure status', async () => {
    const { service, provisioningQueries } = harness({
      outbox: {
        eventKey: 'platform.product.activation-requested.v1',
        createdAt: new Date('2026-08-05T00:01:00.000Z'),
        publishedAt: null,
        lockedAt: null,
        attemptCount: 5,
        lastError: 'private provider details',
        deadLetteredAt: new Date('2026-08-05T00:05:00.000Z'),
      },
    });

    await expect(
      service.getProvisioningStatus(tenantId, 'HRMS'),
    ).resolves.toEqual({
      tenantId,
      productKey: 'HRMS',
      state: 'FAILED',
      attempt: 5,
      updatedAt: '2026-08-05T00:05:00.000Z',
      failureCode: 'LIFECYCLE_EVENT_DELIVERY_FAILED',
    });
    const query = provisioningQueries[0] as {
      where: { tenantId: string };
      orderBy: { createdAt: string };
    };
    expect(query.where.tenantId).toBe(tenantId);
    expect(query.orderBy).toEqual({ createdAt: 'desc' });
  });
});

function firstCallArg<T>(mock: { mock: { calls: unknown[][] } }) {
  return mock.mock.calls[0]?.[0] as T;
}

import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { generateKeyPairSync } from 'node:crypto';
import type { ProductTokenClaims } from '@deltcrm/product-contracts';
import {
  HRMS_PRODUCT_IDENTITY,
  HrmsProductTokenGuard,
} from './hrms-product-token.guard';

const issuer = 'https://auth.blufield.cloud';
const tenantId = '019fa35c-df73-7709-91a1-2d95d361d4f7';
const userId = '019fa35c-df73-7709-91a1-2d95d361d4f8';

describe('HrmsProductTokenGuard', () => {
  const jwt = new JwtService();
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKey = keys.privateKey.export({
    format: 'pem',
    type: 'pkcs8',
  }) as string;
  const publicKey = keys.publicKey.export({
    format: 'pem',
    type: 'spki',
  }) as string;
  const platform = {
    getIdentityStatus: jest.fn().mockResolvedValue({
      tenantId,
      userId,
      membershipId: userId,
      tenantStatus: 'ACTIVE',
      userStatus: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      effectiveAt: new Date().toISOString(),
    }),
    getEntitlements: jest.fn().mockResolvedValue({
      tenantId,
      subscriptionStatus: 'ACTIVE',
      products: [{ key: 'HRMS', active: true, capabilities: {}, limits: {} }],
      version: 1,
      effectiveAt: new Date().toISOString(),
    }),
    getProvisioningStatus: jest.fn(),
  };
  const guard = new HrmsProductTokenGuard(jwt, { issuer, publicKey }, platform);

  beforeEach(() => {
    platform.getIdentityStatus.mockClear();
    platform.getIdentityStatus.mockResolvedValue({
      tenantId,
      userId,
      membershipId: userId,
      tenantStatus: 'ACTIVE',
      userStatus: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      effectiveAt: new Date().toISOString(),
    });
    platform.getEntitlements.mockClear();
    platform.getEntitlements.mockResolvedValue({
      tenantId,
      subscriptionStatus: 'ACTIVE',
      products: [{ key: 'HRMS', active: true, capabilities: {}, limits: {} }],
      version: 1,
      effectiveAt: new Date().toISOString(),
    });
  });

  function token(
    overrides: Partial<ProductTokenClaims> = {},
    signingKey = privateKey,
  ) {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
      {
        sub: userId,
        tenantId,
        userId,
        membershipId: userId,
        roles: ['BUSINESS_ADMIN'],
        products: ['HRMS'],
        capabilities: ['HRMS_ATTENDANCE'],
        permissions: ['hrms.attendance.manage'],
        iss: issuer,
        aud: 'hrms-api',
        iat: now,
        exp: now + 900,
        jti: '019fa35c-df73-7709-91a1-2d95d361d4f9',
        ...overrides,
      },
      {
        privateKey: signingKey,
        algorithm: 'RS256',
      },
    );
  }

  function context(value?: string, headers: Record<string, string> = {}) {
    const request: Record<string, unknown> = {
      headers: value
        ? { ...headers, authorization: `Bearer ${value}` }
        : headers,
    };
    const execution = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    return { execution, request };
  }

  it('accepts a valid audience token and attaches its tenant identity', async () => {
    const request = context(token());
    await expect(guard.canActivate(request.execution)).resolves.toBe(true);
    expect(
      (request.request[HRMS_PRODUCT_IDENTITY] as ProductTokenClaims).tenantId,
    ).toBe(tenantId);
  });

  it.each([
    ['wrong issuer', () => token({ iss: 'https://evil.example' })],
    ['wrong audience', () => token({ aud: 'mail-api' })],
    ['expired token', () => token({ exp: Math.floor(Date.now() / 1000) - 1 })],
    [
      'wrong signature',
      () => {
        const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
        return token(
          {},
          other.privateKey.export({ format: 'pem', type: 'pkcs8' }) as string,
        );
      },
    ],
    ['missing HRMS entitlement', () => token({ products: ['MAIL'] })],
  ])('rejects %s', async (_case, makeToken) => {
    await expect(
      guard.canActivate(context(makeToken()).execution),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a public tenant header that conflicts with the signed tenant', async () => {
    await expect(
      guard.canActivate(
        context(token(), {
          'x-tenant-id': '019fa35c-df73-7709-91a1-2d95d361d40',
        }).execution,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    ['disabled product', 'ACTIVE', false],
    ['suspended subscription', 'SUSPENDED', true],
  ])('rejects a valid token for a %s', async (_case, status, active) => {
    platform.getEntitlements.mockResolvedValueOnce({
      tenantId,
      subscriptionStatus: status,
      products: [{ key: 'HRMS', active, capabilities: {}, limits: {} }],
      version: 2,
      effectiveAt: new Date().toISOString(),
    });

    await expect(
      guard.canActivate(context(token()).execution),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    ['disabled user', 'ACTIVE', 'SUSPENDED', 'SUSPENDED'],
    ['missing membership', 'ACTIVE', 'ACTIVE', 'UNAVAILABLE'],
  ])(
    'rejects a valid token for a %s',
    async (_case, tenantStatus, userStatus, membershipStatus) => {
      platform.getIdentityStatus.mockResolvedValueOnce({
        tenantId,
        userId,
        membershipId: userId,
        tenantStatus,
        userStatus,
        membershipStatus,
        effectiveAt: new Date().toISOString(),
      });

      await expect(
        guard.canActivate(context(token()).execution),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('rejects a valid token after the tenant is suspended', async () => {
    platform.getIdentityStatus.mockResolvedValueOnce({
      tenantId,
      userId,
      membershipId: userId,
      tenantStatus: 'SUSPENDED',
      userStatus: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      effectiveAt: new Date().toISOString(),
    });

    await expect(
      guard.canActivate(context(token()).execution),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

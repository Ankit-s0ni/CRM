import {
  ContractValidationError,
  assertEffectiveEntitlements,
  assertProductIdentityStatus,
  assertProductManifest,
  assertProductTokenClaims,
} from '@deltcrm/product-contracts';
import { HRMS_MANIFEST } from '@deltcrm/product-contracts/hrms';

const ids = {
  tenantId: '0198a4f6-5c53-7e10-8a88-5ab48df8a93a',
  userId: '0198a4f6-5c53-7e10-8a88-5ab48df8a93b',
  membershipId: '0198a4f6-5c53-7e10-8a88-5ab48df8a93c',
  jti: '0198a4f6-5c53-7e10-8a88-5ab48df8a93d',
};

describe('product contract validation', () => {
  it('accepts the registered HRMS manifest', () => {
    expect(() => assertProductManifest(HRMS_MANIFEST)).not.toThrow();
  });

  it.each([
    ['unknown product', { ...HRMS_MANIFEST, key: 'UNKNOWN' }],
    [
      'unknown capability',
      {
        ...HRMS_MANIFEST,
        capabilities: [...HRMS_MANIFEST.capabilities, 'HRMS_UNKNOWN'],
      },
    ],
    [
      'unknown permission',
      {
        ...HRMS_MANIFEST,
        permissions: [...HRMS_MANIFEST.permissions, 'hrms.unknown.read'],
      },
    ],
    ['unknown property', { ...HRMS_MANIFEST, databaseUrl: 'not-allowed' }],
  ])('rejects a manifest with an %s', (_label, manifest) => {
    expect(() => assertProductManifest(manifest)).toThrow(
      ContractValidationError,
    );
  });

  it('accepts registered, audience-specific token claims', () => {
    expect(() =>
      assertProductTokenClaims({
        sub: ids.userId,
        ...ids,
        roles: ['BUSINESS_ADMIN'],
        products: ['HRMS'],
        capabilities: ['HRMS_ATTENDANCE'],
        permissions: ['hrms.attendance.manage'],
        locale: 'en',
        entitlementVersion: 1,
        iss: 'https://auth.blufield.cloud',
        aud: 'hrms-api',
        iat: 1_780_000_000,
        exp: 1_780_000_900,
      }),
    ).not.toThrow();
  });

  it.each([
    ['unknown capability', { capabilities: ['HRMS_UNKNOWN'] }],
    ['unknown permission', { permissions: ['hrms.unknown.read'] }],
    ['missing audience product', { products: ['MAIL'] }],
    ['unknown property', { secret: 'not-allowed' }],
  ])('rejects token claims with an %s', (_label, mutation) => {
    const claims = {
      sub: ids.userId,
      ...ids,
      roles: ['BUSINESS_ADMIN'],
      products: ['HRMS'],
      capabilities: ['HRMS_ATTENDANCE'],
      permissions: ['hrms.attendance.manage'],
      locale: 'en',
      entitlementVersion: 1,
      iss: 'https://auth.blufield.cloud',
      aud: 'hrms-api',
      iat: 1_780_000_000,
      exp: 1_780_000_900,
      ...mutation,
    };
    expect(() => assertProductTokenClaims(claims)).toThrow(
      ContractValidationError,
    );
  });

  it('rejects unknown entitlement capabilities', () => {
    expect(() =>
      assertEffectiveEntitlements({
        tenantId: ids.tenantId,
        subscriptionStatus: 'ACTIVE',
        products: [
          {
            key: 'HRMS',
            active: true,
            capabilities: { HRMS_UNKNOWN: true },
            limits: { employees: 100 },
          },
        ],
        version: 1,
        effectiveAt: '2026-08-05T00:00:00.000Z',
      }),
    ).toThrow(ContractValidationError);
  });

  it('accepts current product identity lifecycle status', () => {
    expect(() =>
      assertProductIdentityStatus({
        tenantId: ids.tenantId,
        userId: ids.userId,
        membershipId: ids.membershipId,
        tenantStatus: 'ACTIVE',
        userStatus: 'ACTIVE',
        membershipStatus: 'ACTIVE',
        effectiveAt: '2026-08-05T00:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it.each([
    ['unknown lifecycle status', { membershipStatus: 'DELETED' }],
    ['unknown property', { passwordHash: 'not-allowed' }],
  ])('rejects identity status with an %s', (_label, mutation) => {
    expect(() =>
      assertProductIdentityStatus({
        tenantId: ids.tenantId,
        userId: ids.userId,
        membershipId: ids.membershipId,
        tenantStatus: 'ACTIVE',
        userStatus: 'ACTIVE',
        membershipStatus: 'ACTIVE',
        effectiveAt: '2026-08-05T00:00:00.000Z',
        ...mutation,
      }),
    ).toThrow(ContractValidationError);
  });
});

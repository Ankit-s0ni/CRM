import {
  ModuleAvailability,
  PlatformRole,
  TenantStatus,
} from '@prisma/client';
import {
  impersonationScopeViolation,
  isReservedSubdomain,
  isValidTimezone,
  moduleAssignmentViolation,
  normalizeWorkspaceInput,
  tenantLifecycleTarget,
} from './platform-policy';

describe('Platform policies', () => {
  it('normalizes workspace identity deterministically', () => {
    expect(
      normalizeWorkspaceInput({
        companyName: '  Acme India  ',
        subdomain: ' Acme-INDIA ',
        adminEmail: ' OWNER@ACME.COM ',
        moduleKeys: ['attendance', ' FIELD_TRACKING ', 'attendance'],
        timezone: ' Asia/Kolkata ',
      }),
    ).toEqual({
      companyName: 'Acme India',
      subdomain: 'acme-india',
      adminEmail: 'owner@acme.com',
      moduleKeys: ['ATTENDANCE', 'FIELD_TRACKING'],
      timezone: 'Asia/Kolkata',
    });
    expect(isReservedSubdomain(' PLATFORM ')).toBe(true);
    expect(isValidTimezone('Asia/Kolkata')).toBe(true);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
  });

  it('keeps lifecycle commands idempotent', () => {
    expect(tenantLifecycleTarget(TenantStatus.ACTIVE, 'suspend')).toBe(
      TenantStatus.SUSPENDED,
    );
    expect(tenantLifecycleTarget(TenantStatus.SUSPENDED, 'suspend')).toBeNull();
    expect(tenantLifecycleTarget(TenantStatus.SUSPENDED, 'reactivate')).toBe(
      TenantStatus.ACTIVE,
    );
    expect(tenantLifecycleTarget(TenantStatus.ACTIVE, 'reactivate')).toBeNull();
  });

  it('rejects unavailable, missing dependency and conflicting modules', () => {
    const field = {
      key: 'FIELD_TRACKING',
      availability: ModuleAvailability.AVAILABLE,
      dependencyKeys: ['ATTENDANCE'],
      conflictKeys: [],
    };
    expect(moduleAssignmentViolation([field], ['FIELD_TRACKING'])).toBe(
      'FIELD_TRACKING requires ATTENDANCE',
    );
    expect(
      moduleAssignmentViolation(
        [{ ...field, conflictKeys: ['LEGACY_TRACKING'] }],
        ['FIELD_TRACKING', 'ATTENDANCE', 'LEGACY_TRACKING'],
      ),
    ).toBe('FIELD_TRACKING conflicts with LEGACY_TRACKING');
    expect(
      moduleAssignmentViolation(
        [{ ...field, availability: ModuleAvailability.COMING_SOON }],
        ['FIELD_TRACKING', 'ATTENDANCE'],
      ),
    ).toBe('FIELD_TRACKING is not available');
    expect(
      moduleAssignmentViolation([field], ['FIELD_TRACKING', 'ATTENDANCE']),
    ).toBeNull();
  });

  it('limits impersonation to target-owned read scopes', () => {
    expect(
      impersonationScopeViolation({
        role: PlatformRole.SUPPORT,
        requested: ['identity.users.read'],
        targetPermissions: new Set(['identity.users.read']),
      }),
    ).toMatch(/Support impersonation/);
    expect(
      impersonationScopeViolation({
        role: PlatformRole.SUPER_ADMIN,
        requested: ['billing.subscription.read'],
        targetPermissions: new Set(['billing.subscription.read']),
      }),
    ).toMatch(/exceed/);
    expect(
      impersonationScopeViolation({
        role: PlatformRole.SUPPORT,
        requested: ['organization.employees.read'],
        targetPermissions: new Set(['organization.employees.read']),
      }),
    ).toBeNull();
  });
});

import { ModuleAvailability, PlatformRole, TenantStatus } from '@prisma/client';

const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'billing',
  'help',
  'mail',
  'platform',
  'status',
  'support',
  'www',
]);

export const IMPERSONATION_READ_SCOPES = new Set([
  'organization.departments.read',
  'organization.designations.read',
  'organization.employees.read',
  'identity.users.read',
  'identity.roles.read',
  'workspace.settings.read',
  'workspace.modules.read',
  'attendance.records.read',
  'attendance.reports.read',
]);

export function normalizeWorkspaceInput(input: {
  companyName: string;
  subdomain: string;
  adminEmail: string;
  moduleKeys: string[];
  timezone: string;
}) {
  return {
    ...input,
    companyName: input.companyName.trim(),
    subdomain: input.subdomain.trim().toLowerCase(),
    adminEmail: input.adminEmail.trim().toLowerCase(),
    moduleKeys: [
      ...new Set(input.moduleKeys.map((key) => key.trim().toUpperCase())),
    ].sort(),
    timezone: input.timezone.trim(),
  };
}

export function isReservedSubdomain(subdomain: string) {
  return RESERVED_SUBDOMAINS.has(subdomain.trim().toLowerCase());
}

export function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function tenantLifecycleTarget(
  current: TenantStatus,
  action: 'suspend' | 'reactivate',
) {
  if (action === 'suspend') {
    return current === TenantStatus.SUSPENDED ? null : TenantStatus.SUSPENDED;
  }
  return current === TenantStatus.SUSPENDED ? TenantStatus.ACTIVE : null;
}

type AssignableModule = {
  key: string;
  availability: ModuleAvailability;
  dependencyKeys: string[];
  conflictKeys: string[];
};

export function moduleAssignmentViolation(
  modules: AssignableModule[],
  requestedKeys: string[],
) {
  const selected = new Set(requestedKeys);
  for (const module of modules) {
    if (module.availability !== ModuleAvailability.AVAILABLE) {
      return `${module.key} is not available`;
    }
    const missing = module.dependencyKeys.filter((key) => !selected.has(key));
    if (missing.length) return `${module.key} requires ${missing.join(', ')}`;
    const conflicts = module.conflictKeys.filter((key) => selected.has(key));
    if (conflicts.length)
      return `${module.key} conflicts with ${conflicts.join(', ')}`;
  }
  return null;
}

export function impersonationScopeViolation(input: {
  role: PlatformRole;
  requested: string[];
  targetPermissions: Set<string>;
}) {
  if (!input.requested.length) return 'At least one scope is required';
  if (
    input.requested.some(
      (scope) =>
        !IMPERSONATION_READ_SCOPES.has(scope) ||
        !input.targetPermissions.has(scope),
    )
  ) {
    return 'Requested scopes exceed the impersonation policy or target permissions';
  }
  if (
    input.role === PlatformRole.SUPPORT &&
    input.requested.some((scope) => scope.startsWith('identity.'))
  ) {
    return 'Support impersonation cannot access tenant identity administration';
  }
  return null;
}

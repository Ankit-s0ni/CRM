export const PLATFORM_PERMISSIONS = [
  'platform.dashboard.read',
  'platform.tenants.read',
  'platform.tenants.create',
  'platform.tenants.update',
  'platform.tenants.lifecycle',
  'platform.modules.read',
  'platform.modules.manage',
  'platform.impersonation.create',
  'platform.audit.read',
  'platform.alerts.read',
  'platform.alerts.manage',
  'platform.health.read',
  'platform.plans.read',
  'platform.plans.manage',
  'platform.billing.read',
  'platform.billing.manage',
  'platform.dunning.manage',
] as const;

export type PlatformPermissionKey = (typeof PLATFORM_PERMISSIONS)[number];

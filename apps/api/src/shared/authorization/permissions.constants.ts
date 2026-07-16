export const PERMISSIONS = {
  DEPARTMENTS_READ: 'organization.departments.read',
  DEPARTMENTS_CREATE: 'organization.departments.create',
  DEPARTMENTS_UPDATE: 'organization.departments.update',
  DEPARTMENTS_DELETE: 'organization.departments.delete',
  DESIGNATIONS_READ: 'organization.designations.read',
  DESIGNATIONS_CREATE: 'organization.designations.create',
  DESIGNATIONS_UPDATE: 'organization.designations.update',
  DESIGNATIONS_DELETE: 'organization.designations.delete',
  EMPLOYEES_READ: 'organization.employees.read',
  EMPLOYEES_REPORTS_READ: 'organization.employees.reports.read',
  EMPLOYEES_SELF_READ: 'organization.employees.self.read',
  EMPLOYEES_CREATE: 'organization.employees.create',
  EMPLOYEES_UPDATE: 'organization.employees.update',
  EMPLOYEES_LIFECYCLE: 'organization.employees.lifecycle',
  IMPORTS_READ: 'organization.imports.read',
  IMPORTS_CREATE: 'organization.imports.create',
  USERS_READ: 'identity.users.read',
  USERS_INVITE: 'identity.users.invite',
  USERS_ROLES_UPDATE: 'identity.users.roles.update',
  USERS_STATUS_UPDATE: 'identity.users.status.update',
  ROLES_READ: 'identity.roles.read',
  ROLES_CREATE: 'identity.roles.create',
  ROLES_UPDATE: 'identity.roles.update',
  ROLES_DELETE: 'identity.roles.delete',
  SETTINGS_READ: 'workspace.settings.read',
  SETTINGS_UPDATE: 'workspace.settings.update',
  MODULES_READ: 'workspace.modules.read',
  BILLING_SUBSCRIPTION_READ: 'billing.subscription.read',
  BILLING_INVOICES_READ: 'billing.invoices.read',
  BILLING_PAYMENT_METHODS_MANAGE: 'billing.payment-methods.manage',
  ATTENDANCE_CONFIG_MANAGE: 'attendance.config.manage',
  ATTENDANCE_OFFICES_READ: 'attendance.offices.read',
  ATTENDANCE_OFFICES_MANAGE: 'attendance.offices.manage',
  ATTENDANCE_POLICIES_READ: 'attendance.policies.read',
  ATTENDANCE_POLICIES_MANAGE: 'attendance.policies.manage',
  ATTENDANCE_SHIFTS_READ: 'attendance.shifts.read',
  ATTENDANCE_SHIFTS_MANAGE: 'attendance.shifts.manage',
  ATTENDANCE_ROSTERS_READ: 'attendance.rosters.read',
  ATTENDANCE_ROSTERS_MANAGE: 'attendance.rosters.manage',
  ATTENDANCE_HOLIDAYS_READ: 'attendance.holidays.read',
  ATTENDANCE_HOLIDAYS_MANAGE: 'attendance.holidays.manage',
  ATTENDANCE_RECORDS_READ: 'attendance.records.read',
  ATTENDANCE_RECORDS_SELF_READ: 'attendance.records.self.read',
  ATTENDANCE_APPROVALS_MANAGE: 'attendance.approvals.manage',
  ATTENDANCE_REPORTS_READ: 'attendance.reports.read',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  readonly PermissionKey[]
> = {
  BUSINESS_ADMIN: ALL_PERMISSIONS,
  HR_ADMIN: ALL_PERMISSIONS.filter(
    (permission) => !permission.startsWith('billing.'),
  ),
  MANAGER: [
    PERMISSIONS.EMPLOYEES_REPORTS_READ,
    PERMISSIONS.EMPLOYEES_SELF_READ,
    PERMISSIONS.ATTENDANCE_RECORDS_READ,
    PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ,
    PERMISSIONS.ATTENDANCE_APPROVALS_MANAGE,
  ],
  EMPLOYEE: [
    PERMISSIONS.EMPLOYEES_SELF_READ,
    PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ,
  ],
};

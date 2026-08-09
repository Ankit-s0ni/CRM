import type { ProductManifest } from './contracts';

export const HRMS_PRODUCT_KEY = 'HRMS' as const;
export const HRMS_AUDIENCE = 'hrms-api' as const;

export const HRMS_CAPABILITIES = {
  EMPLOYEES: 'HRMS_EMPLOYEES',
  ORGANIZATION: 'HRMS_ORGANIZATION',
  ATTENDANCE: 'HRMS_ATTENDANCE',
  LEAVE: 'HRMS_LEAVE',
  PAYROLL: 'HRMS_PAYROLL',
  DOCUMENTS: 'HRMS_DOCUMENTS',
} as const;

export const HRMS_PERMISSIONS = {
  EMPLOYEES_READ: 'hrms.employees.read',
  EMPLOYEES_MANAGE: 'hrms.employees.manage',
  ATTENDANCE_SELF_READ: 'hrms.attendance.self.read',
  ATTENDANCE_SELF_WRITE: 'hrms.attendance.self.write',
  ATTENDANCE_READ: 'hrms.attendance.read',
  ATTENDANCE_MANAGE: 'hrms.attendance.manage',
  DEVICES_SELF_READ: 'hrms.devices.self.read',
  DEVICES_SELF_WRITE: 'hrms.devices.self.write',
  DEVICES_READ: 'hrms.devices.read',
  DEVICES_MANAGE: 'hrms.devices.manage',
  LEAVE_SELF_READ: 'hrms.leave.self.read',
  LEAVE_SELF_WRITE: 'hrms.leave.self.write',
  LEAVE_APPROVE: 'hrms.leave.approve',
  LEAVE_READ: 'hrms.leave.read',
  LEAVE_MANAGE: 'hrms.leave.manage',
  PAYROLL_READ: 'hrms.payroll.read',
  PAYROLL_MANAGE: 'hrms.payroll.manage',
  DOCUMENTS_READ: 'hrms.documents.read',
  DOCUMENTS_MANAGE: 'hrms.documents.manage',
} as const;

export const HRMS_MANIFEST = {
  contractVersion: '1.0',
  key: HRMS_PRODUCT_KEY,
  name: 'DeltCRM HRMS',
  version: '1.0.0',
  frontendPathTemplate: '/{locale}/app/hrms',
  apiPath: '/api/hrms',
  healthEndpoint: '/healthz',
  readinessEndpoint: '/readyz',
  permissions: Object.values(HRMS_PERMISSIONS),
  capabilities: Object.values(HRMS_CAPABILITIES),
  eventsConsumed: [
    'platform.tenant.provisioned.v1',
    'platform.product.activation-requested.v1',
    'platform.product.suspension-requested.v1',
    'platform.product.deletion-requested.v1',
  ],
  eventsPublished: [
    'hrms.tenant.activated.v1',
    'hrms.tenant.activation-failed.v1',
    'hrms.tenant.suspended.v1',
    'hrms.employee.created.v1',
    'hrms.device.registered.v1',
    'hrms.device.approved.v1',
    'hrms.device.blocked.v1',
    'hrms.device.replaced.v1',
    'hrms.device.self-removed.v1',
    'hrms.leave.policy.created.v1',
    'hrms.leave.policy.updated.v1',
    'hrms.leave.balance.adjusted.v1',
    'hrms.leave.submitted.v1',
    'hrms.leave.approved.v1',
    'hrms.leave.rejected.v1',
    'hrms.leave.cancelled.v1',
    'hrms.payroll.settings.created.v1',
    'hrms.payroll.settings.updated.v1',
    'hrms.employee-document.registered.v1',
    'hrms.employee-document.deleted.v1',
  ],
} as const satisfies ProductManifest;

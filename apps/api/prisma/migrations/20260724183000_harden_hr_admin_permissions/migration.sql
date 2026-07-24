DELETE FROM role_permissions
WHERE "roleId" IN (
  SELECT id
  FROM roles
  WHERE name = 'HR_ADMIN' AND "isSystem" = true
);

INSERT INTO role_permissions ("roleId", "permissionId")
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'HR_ADMIN'
  AND roles."isSystem" = true
  AND permissions.key IN (
    'organization.departments.read',
    'organization.departments.create',
    'organization.departments.update',
    'organization.departments.delete',
    'organization.designations.read',
    'organization.designations.create',
    'organization.designations.update',
    'organization.designations.delete',
    'organization.employees.read',
    'organization.employees.reports.read',
    'organization.employees.self.read',
    'organization.employees.create',
    'organization.employees.update',
    'organization.employees.lifecycle',
    'organization.employee-documents.read',
    'organization.employee-documents.manage',
    'organization.imports.read',
    'organization.imports.create',
    'identity.users.read',
    'identity.users.invite',
    'identity.users.status.update',
    'workspace.settings.read',
    'workspace.modules.read',
    'workspace.audit.read',
    'attendance.config.manage',
    'attendance.config.read',
    'attendance.offices.read',
    'attendance.offices.manage',
    'attendance.policies.read',
    'attendance.policies.manage',
    'attendance.shifts.read',
    'attendance.shifts.manage',
    'attendance.rosters.read',
    'attendance.rosters.manage',
    'attendance.holidays.read',
    'attendance.holidays.manage',
    'attendance.records.read',
    'attendance.exceptions.read',
    'attendance.exceptions.manage',
    'attendance.approvals.manage',
    'attendance.reports.read',
    'attendance.reports.generate',
    'attendance.payroll-lock.manage',
    'attendance.devices.read',
    'attendance.devices.manage',
    'attendance.biometrics.read',
    'attendance.biometrics.manage',
    'attendance.verification.read',
    'attendance.alert-rules.manage',
    'attendance.security-alerts.read',
    'attendance.security-alerts.manage',
    'attendance.field.live.read',
    'attendance.field.routes.read',
    'attendance.regularizations.self',
    'attendance.regularizations.manage',
    'notifications.self',
    'leave.self',
    'leave.approve',
    'leave.manage'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

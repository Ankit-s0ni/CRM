-- Existing tenant roles predate Payroll. Add the permissions expected by the
-- current role policy without replacing or removing any tenant-specific grants.

INSERT INTO "permissions" ("id", "key")
SELECT gen_random_uuid(), permission_key
FROM unnest(ARRAY[
  'payroll.settings.read',
  'payroll.settings.manage',
  'payroll.compensation.read',
  'payroll.compensation.manage',
  'payroll.protected-data.read',
  'payroll.protected-data.manage',
  'payroll.policies.read',
  'payroll.policies.manage',
  'payroll.components.read',
  'payroll.components.manage',
  'payroll.structures.read',
  'payroll.structures.manage',
  'payroll.accounting.read',
  'payroll.accounting.manage',
  'payroll.audit.read',
  'payroll.inputs.read',
  'payroll.inputs.manage',
  'payroll.runs.read',
  'payroll.runs.calculate',
  'payroll.runs.approve',
  'payroll.runs.finalize',
  'payroll.payments.read',
  'payroll.payments.manage',
  'payroll.payslips.self',
  'payroll.payslips.read',
  'payroll.payslips.publish',
  'payroll.reports.generate'
]) AS permission_key
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "roles" role
JOIN "permissions" permission
  ON permission."key" LIKE 'payroll.%'
WHERE role."name" IN ('BUSINESS_ADMIN', 'HR_ADMIN')
  AND role."isSystem" = true
ON CONFLICT DO NOTHING;

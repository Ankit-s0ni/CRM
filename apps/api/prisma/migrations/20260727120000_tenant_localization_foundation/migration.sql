CREATE TYPE "LocaleDirection" AS ENUM ('LTR', 'RTL');
CREATE TYPE "LocalizationStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "locale_packs" (
  "id" UUID NOT NULL,
  "locale" TEXT NOT NULL,
  "parentLocale" TEXT,
  "displayName" TEXT NOT NULL,
  "nativeName" TEXT NOT NULL,
  "direction" "LocaleDirection" NOT NULL,
  "status" "LocalizationStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "publishedAt" TIMESTAMP(3),
  "publishedBy" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "locale_packs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "locale_packs_version_positive" CHECK ("version" > 0)
);

CREATE TABLE "localization_keys" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "namespace" TEXT NOT NULL,
  "defaultMessage" TEXT NOT NULL,
  "description" TEXT,
  "placeholderSchema" JSONB NOT NULL DEFAULT '{}',
  "isTenantEditable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "localization_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "locale_translations" (
  "localePackId" UUID NOT NULL,
  "keyId" UUID NOT NULL,
  "value" TEXT NOT NULL,
  "status" "LocalizationStatus" NOT NULL DEFAULT 'DRAFT',
  "reviewedBy" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "locale_translations_pkey" PRIMARY KEY ("localePackId", "keyId"),
  CONSTRAINT "locale_translations_localePackId_fkey"
    FOREIGN KEY ("localePackId") REFERENCES "locale_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "locale_translations_keyId_fkey"
    FOREIGN KEY ("keyId") REFERENCES "localization_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "tenant_locale_policies" (
  "tenantId" UUID NOT NULL,
  "defaultLocale" TEXT NOT NULL DEFAULT 'en',
  "regionalLocale" TEXT NOT NULL DEFAULT 'ar',
  "regionalOverrideReason" TEXT,
  "enabledLocales" TEXT[] NOT NULL DEFAULT ARRAY['en']::TEXT[],
  "allowUserPreference" BOOLEAN NOT NULL DEFAULT false,
  "allowTenantOverrides" BOOLEAN NOT NULL DEFAULT false,
  "catalogVersion" INTEGER NOT NULL DEFAULT 1,
  "updatedBy" UUID,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_locale_policies_pkey" PRIMARY KEY ("tenantId"),
  CONSTRAINT "tenant_locale_policies_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tenant_locale_policies_catalog_version_positive" CHECK ("catalogVersion" > 0),
  CONSTRAINT "tenant_locale_policies_enabled_not_empty" CHECK (cardinality("enabledLocales") > 0),
  CONSTRAINT "tenant_locale_policies_default_enabled" CHECK ("defaultLocale" = ANY("enabledLocales"))
);

CREATE TABLE "tenant_translation_overrides" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "locale" TEXT NOT NULL,
  "keyId" UUID NOT NULL,
  "value" TEXT NOT NULL,
  "status" "LocalizationStatus" NOT NULL DEFAULT 'DRAFT',
  "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "publishedBy" UUID,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_translation_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_translation_overrides_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tenant_translation_overrides_keyId_fkey"
    FOREIGN KEY ("keyId") REFERENCES "localization_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tenant_translation_overrides_version_positive" CHECK ("version" > 0),
  CONSTRAINT "tenant_translation_overrides_reason_not_blank" CHECK (length(trim("reason")) >= 5)
);

CREATE UNIQUE INDEX "locale_packs_locale_version_key" ON "locale_packs"("locale", "version");
CREATE INDEX "locale_packs_locale_status_version_idx" ON "locale_packs"("locale", "status", "version");
CREATE UNIQUE INDEX "localization_keys_key_key" ON "localization_keys"("key");
CREATE INDEX "localization_keys_namespace_key_idx" ON "localization_keys"("namespace", "key");
CREATE INDEX "locale_translations_keyId_status_idx" ON "locale_translations"("keyId", "status");
CREATE UNIQUE INDEX "tenant_translation_overrides_tenantId_locale_keyId_version_key"
  ON "tenant_translation_overrides"("tenantId", "locale", "keyId", "version");
CREATE INDEX "tenant_translation_overrides_tenantId_locale_status_idx"
  ON "tenant_translation_overrides"("tenantId", "locale", "status");

ALTER TABLE "tenant_locale_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_translation_overrides" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_locale_policies" TO app_user
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation ON "tenant_translation_overrides" TO app_user
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY platform_access ON "tenant_locale_policies" TO platform_runtime
  USING (true) WITH CHECK (true);
CREATE POLICY platform_access ON "tenant_translation_overrides" TO platform_runtime
  USING (true) WITH CHECK (true);

GRANT SELECT ON "locale_packs", "localization_keys", "locale_translations" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_locale_policies", "tenant_translation_overrides" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "locale_packs", "localization_keys", "locale_translations",
  "tenant_locale_policies", "tenant_translation_overrides"
TO platform_runtime;

INSERT INTO permissions (id, key)
VALUES
  (gen_random_uuid(), 'workspace.localization.read'),
  (gen_random_uuid(), 'workspace.localization.manage'),
  (gen_random_uuid(), 'workspace.localization.overrides.manage')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions ("roleId", "permissionId")
SELECT role.id, permission.id
FROM roles role
JOIN permissions permission ON permission.key IN (
  'workspace.localization.read',
  'workspace.localization.manage',
  'workspace.localization.overrides.manage'
)
WHERE role.name = 'BUSINESS_ADMIN' AND role."isSystem" = true
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO role_permissions ("roleId", "permissionId")
SELECT role.id, permission.id
FROM roles role
JOIN permissions permission ON permission.key = 'workspace.localization.read'
WHERE role.name IN ('HR_ADMIN', 'MANAGER', 'EMPLOYEE') AND role."isSystem" = true
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO platform_permissions (id, key)
VALUES
  (gen_random_uuid(), 'platform.localization.read'),
  (gen_random_uuid(), 'platform.localization.translate'),
  (gen_random_uuid(), 'platform.localization.review'),
  (gen_random_uuid(), 'platform.localization.publish'),
  (gen_random_uuid(), 'platform.localization.tenants.manage')
ON CONFLICT (key) DO NOTHING;

INSERT INTO platform_role_permissions (role, "permissionId")
SELECT 'SUPER_ADMIN'::"PlatformRole", permission.id
FROM platform_permissions permission
WHERE permission.key LIKE 'platform.localization.%'
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO platform_role_permissions (role, "permissionId")
SELECT 'SUPPORT'::"PlatformRole", permission.id
FROM platform_permissions permission
WHERE permission.key = 'platform.localization.read'
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "tenant_locale_policies" (
  "tenantId", "defaultLocale", "regionalLocale", "enabledLocales", "catalogVersion"
)
SELECT tenant.id,
       'en',
       CASE
         WHEN EXISTS (
           SELECT 1 FROM office_locations office
           WHERE office."tenantId" = tenant.id AND office."countryCode" = 'OM'
         ) THEN 'ar-OM'
         WHEN EXISTS (
           SELECT 1 FROM office_locations office
           WHERE office."tenantId" = tenant.id AND office."countryCode" = 'AE'
         ) THEN 'ar-AE'
         ELSE 'ar'
       END,
       ARRAY[
         'en',
         CASE
           WHEN EXISTS (
             SELECT 1 FROM office_locations office
             WHERE office."tenantId" = tenant.id AND office."countryCode" = 'OM'
           ) THEN 'ar-OM'
           WHEN EXISTS (
             SELECT 1 FROM office_locations office
             WHERE office."tenantId" = tenant.id AND office."countryCode" = 'AE'
           ) THEN 'ar-AE'
           ELSE 'ar'
         END
       ]::TEXT[],
       1
FROM tenants tenant
LEFT JOIN tenant_settings settings ON settings."tenantId" = tenant.id
ON CONFLICT ("tenantId") DO NOTHING;

INSERT INTO "locale_packs" (
  "id", "locale", "parentLocale", "displayName", "nativeName",
  "direction", "status", "version", "publishedAt"
)
VALUES
  (gen_random_uuid(), 'en', NULL, 'English', 'English', 'LTR', 'PUBLISHED', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ar', 'en', 'Arabic', 'العربية', 'RTL', 'PUBLISHED', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ar-OM', 'ar', 'Arabic (Oman)', 'العربية (عُمان)', 'RTL', 'PUBLISHED', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ar-AE', 'ar', 'Arabic (UAE)', 'العربية (الإمارات)', 'RTL', 'PUBLISHED', 1, CURRENT_TIMESTAMP)
ON CONFLICT ("locale", "version") DO NOTHING;

INSERT INTO "localization_keys" (
  "id", "key", "namespace", "defaultMessage", "description", "placeholderSchema", "isTenantEditable"
)
SELECT gen_random_uuid(), source.key, source.namespace, source.message, source.description,
       source.placeholders::jsonb, source.tenant_editable
FROM (VALUES
  ('common.action.retry', 'common', 'Retry', 'Retry a failed request', '{}', false),
  ('common.action.close', 'common', 'Close', 'Close a surface', '{}', false),
  ('common.action.save', 'common', 'Save changes', 'Save edited settings', '{}', false),
  ('common.action.open', 'common', 'Open', 'Open a destination', '{}', false),
  ('common.state.loading', 'common', 'Loading...', 'Generic loading state', '{}', false),
  ('common.state.saving', 'common', 'Saving...', 'Generic saving state', '{}', false),
  ('common.state.live', 'common', 'Live', 'Live data indicator', '{}', false),
  ('common.state.stale', 'common', 'Data may be stale', 'Stale data indicator', '{}', false),
  ('common.state.updatedSecondsAgo', 'common', 'updated {seconds}s ago', 'Relative update time', '{"seconds":"number"}', false),
  ('tenant.shell.workspace', 'tenant-shell', 'DeltCRM workspace', 'Workspace brand subtitle', '{}', true),
  ('tenant.shell.logout', 'tenant-shell', 'Logout', 'Sign out action', '{}', false),
  ('tenant.shell.notifications', 'tenant-shell', 'Notifications', 'Notifications accessible label', '{}', false),
  ('tenant.shell.closeNavigation', 'tenant-shell', 'Close navigation', 'Mobile navigation close label', '{}', false),
  ('tenant.shell.openNavigation', 'tenant-shell', 'Open navigation', 'Mobile navigation open label', '{}', false),
  ('tenant.shell.workspaceUser', 'tenant-shell', 'Workspace user', 'Fallback user role label', '{}', false),
  ('tenant.shell.contextNavigation', 'tenant-shell', '{context} navigation', 'Context navigation accessible label', '{"context":"string"}', false),
  ('tenant.search.label', 'tenant-shell', 'Search employees or settings', 'Global search accessible label', '{}', false),
  ('tenant.search.placeholder', 'tenant-shell', 'Search employees or settings...', 'Global search placeholder', '{}', false),
  ('tenant.search.employeeDirectory', 'tenant-shell', 'Employee directory', 'Search destination', '{}', false),
  ('tenant.search.organizationStructure', 'tenant-shell', 'Organization structure', 'Search destination', '{}', false),
  ('tenant.search.employeeImport', 'tenant-shell', 'Employee import', 'Search destination', '{}', false),
  ('tenant.search.attendanceLeave', 'tenant-shell', 'Attendance leave', 'Search destination', '{}', false),
  ('tenant.search.companySettings', 'tenant-shell', 'Company settings', 'Search destination', '{}', false),
  ('tenant.search.attendancePolicies', 'tenant-shell', 'Attendance policies', 'Search destination', '{}', false),
  ('tenant.navigation.dashboard', 'tenant-navigation', 'Dashboard', 'Primary navigation label', '{}', false),
  ('tenant.navigation.employees', 'tenant-navigation', 'Employees', 'Primary navigation label', '{}', false),
  ('tenant.navigation.modules', 'tenant-navigation', 'Modules', 'Primary navigation label', '{}', false),
  ('tenant.navigation.reports', 'tenant-navigation', 'Reports', 'Primary navigation label', '{}', false),
  ('tenant.navigation.settings', 'tenant-navigation', 'Settings', 'Primary navigation label', '{}', false),
  ('tenant.navigation.directory', 'tenant-navigation', 'Directory', 'Employee navigation label', '{}', false),
  ('tenant.navigation.organization', 'tenant-navigation', 'Organization', 'Employee navigation label', '{}', false),
  ('tenant.navigation.bulkImport', 'tenant-navigation', 'Bulk import', 'Employee navigation label', '{}', false),
  ('tenant.navigation.allModules', 'tenant-navigation', 'All modules', 'Module navigation label', '{}', false),
  ('tenant.navigation.attendance', 'tenant-navigation', 'Attendance', 'Module navigation label', '{}', false),
  ('tenant.navigation.payroll', 'tenant-navigation', 'Payroll', 'Module navigation label', '{}', false),
  ('tenant.navigation.reportCenter', 'tenant-navigation', 'Report center', 'Report navigation label', '{}', false),
  ('tenant.navigation.attendanceReports', 'tenant-navigation', 'Attendance reports', 'Report navigation label', '{}', false),
  ('tenant.navigation.payrollReports', 'tenant-navigation', 'Payroll reports', 'Report navigation label', '{}', false),
  ('tenant.navigation.settingsHome', 'tenant-navigation', 'Settings home', 'Settings navigation label', '{}', false),
  ('tenant.navigation.company', 'tenant-navigation', 'Company', 'Settings navigation label', '{}', false),
  ('tenant.navigation.adminAccess', 'tenant-navigation', 'Admin access', 'Settings navigation label', '{}', false),
  ('tenant.navigation.security', 'tenant-navigation', 'Security', 'Settings navigation label', '{}', false),
  ('tenant.navigation.notifications', 'tenant-navigation', 'Notifications', 'Settings navigation label', '{}', false),
  ('tenant.navigation.integrations', 'tenant-navigation', 'Integrations', 'Settings navigation label', '{}', false),
  ('tenant.navigation.auditHistory', 'tenant-navigation', 'Audit history', 'Settings navigation label', '{}', false),
  ('tenant.navigation.billing', 'tenant-navigation', 'Billing', 'Settings navigation label', '{}', false),
  ('tenant.navigation.localization', 'tenant-navigation', 'Language & localization', 'Settings navigation label', '{}', false),
  ('tenant.dashboard.header.today', 'tenant-dashboard', 'Today', 'Dashboard page title', '{}', false),
  ('tenant.dashboard.header.eyebrow', 'tenant-dashboard', 'Workspace operations', 'Dashboard eyebrow', '{}', false),
  ('tenant.dashboard.header.title', 'tenant-dashboard', 'HR operations', 'Dashboard heading', '{}', true),
  ('tenant.dashboard.header.welcome', 'tenant-dashboard', 'Welcome, {name}. Review today''s workforce and every queue that needs action.', 'Dashboard introduction', '{"name":"string"}', false),
  ('tenant.dashboard.employee.workspace', 'tenant-dashboard', 'Employee workspace', 'Employee dashboard eyebrow', '{}', false),
  ('tenant.dashboard.employee.workspaceBody', 'tenant-dashboard', 'Record your workday and review the server-confirmed state.', 'Employee dashboard introduction', '{}', false),
  ('tenant.dashboard.header.greeting', 'tenant-dashboard', 'Hello, {name}', 'Dashboard greeting', '{"name":"string"}', false),
  ('tenant.dashboard.connecting', 'tenant-dashboard', 'Connecting live board...', 'Dashboard loading subtitle', '{}', false),
  ('tenant.dashboard.overview.title', 'tenant-dashboard', 'Workspace overview', 'Business overview title', '{}', true),
  ('tenant.dashboard.overview.aria', 'tenant-dashboard', 'Business Admin overview', 'Business overview accessible label', '{}', false),
  ('tenant.dashboard.overview.subtitle', 'tenant-dashboard', 'Business Admin controls and readiness', 'Business overview subtitle', '{}', false),
  ('tenant.dashboard.overview.ownerView', 'tenant-dashboard', 'Owner view', 'Business overview badge', '{}', false),
  ('tenant.dashboard.overview.employeeUsage', 'tenant-dashboard', 'Employee usage', 'Overview metric', '{}', false),
  ('tenant.dashboard.overview.availableSeats', 'tenant-dashboard', '{percent}% of available seats', 'Employee quota help', '{"percent":"number"}', false),
  ('tenant.dashboard.overview.quotaUnavailable', 'tenant-dashboard', 'Quota unavailable', 'Overview metric fallback', '{}', false),
  ('tenant.dashboard.overview.workspaceSetup', 'tenant-dashboard', 'Workspace setup', 'Overview metric', '{}', false),
  ('tenant.dashboard.overview.ready', 'tenant-dashboard', 'Ready', 'Setup state', '{}', false),
  ('tenant.dashboard.overview.needsSetup', 'tenant-dashboard', 'Needs setup', 'Setup state', '{}', false),
  ('tenant.dashboard.overview.setupReadyBody', 'tenant-dashboard', 'Required organization and attendance inputs exist', 'Setup ready explanation', '{}', false),
  ('tenant.dashboard.overview.setupMissingBody', 'tenant-dashboard', 'Open configuration health to resolve gaps', 'Setup missing explanation', '{}', false),
  ('tenant.dashboard.overview.enabledModules', 'tenant-dashboard', 'Enabled modules', 'Overview metric', '{}', false),
  ('tenant.dashboard.overview.noModules', 'tenant-dashboard', 'No modules reported', 'Module fallback', '{}', false),
  ('tenant.dashboard.overview.workspaceUsers', 'tenant-dashboard', 'Workspace users', 'Overview metric', '{}', false),
  ('tenant.dashboard.overview.userAccessDetail', 'tenant-dashboard', '{pending} pending invitations · {unavailable} unavailable', 'Workspace user access detail', '{"pending":"number","unavailable":"number"}', false),
  ('tenant.dashboard.overview.userAccessUnavailable', 'tenant-dashboard', 'User access unavailable', 'User metric fallback', '{}', false),
  ('tenant.dashboard.workforce.title', 'tenant-dashboard', 'Workforce', 'Workforce section title', '{}', true),
  ('tenant.dashboard.workforce.summary', 'tenant-dashboard', 'Workforce summary', 'Workforce accessible label', '{}', false),
  ('tenant.dashboard.workforce.scope', 'tenant-dashboard', 'Counts follow your employee reporting scope', 'Workforce scope help', '{}', false),
  ('tenant.dashboard.workforce.openDirectory', 'tenant-dashboard', 'Open directory', 'Open employee directory action', '{}', false),
  ('tenant.dashboard.workforce.active', 'tenant-dashboard', 'Active workforce', 'Workforce metric', '{}', false),
  ('tenant.dashboard.workforce.onNotice', 'tenant-dashboard', 'On notice', 'Workforce metric', '{}', false),
  ('tenant.dashboard.workforce.joiningSoon', 'tenant-dashboard', 'Joining in 30 days', 'Workforce metric', '{}', false),
  ('tenant.dashboard.workforce.missingManager', 'tenant-dashboard', 'Missing manager', 'Workforce metric', '{}', false),
  ('tenant.dashboard.workforce.former', 'tenant-dashboard', 'Former employees', 'Workforce metric', '{}', false),
  ('tenant.dashboard.attendanceSummary', 'tenant-dashboard', 'Attendance summary', 'Attendance summary accessible label', '{}', false),
  ('tenant.dashboard.search.label', 'tenant-dashboard', 'Search dashboard employees', 'Dashboard search accessible label', '{}', false),
  ('tenant.dashboard.search.placeholder', 'tenant-dashboard', 'Search employees...', 'Dashboard search placeholder', '{}', false),
  ('tenant.dashboard.view.grid', 'tenant-dashboard', 'Grid view', 'Grid view accessible label', '{}', false),
  ('tenant.dashboard.view.list', 'tenant-dashboard', 'List view', 'List view accessible label', '{}', false),
  ('tenant.dashboard.empty.title', 'tenant-dashboard', 'No employees match this view', 'No matching employees title', '{}', false),
  ('tenant.dashboard.empty.body', 'tenant-dashboard', 'Try another status or clear the search.', 'No matching employees help', '{}', false),
  ('tenant.dashboard.employee.openProfile', 'tenant-dashboard', 'Open {name} employee profile', 'Employee card accessible label', '{"name":"string"}', false),
  ('tenant.dashboard.employee.checkedInAt', 'tenant-dashboard', 'In {time}', 'Employee check-in time', '{"time":"string"}', false),
  ('tenant.dashboard.employee.noCheckin', 'tenant-dashboard', 'No check-in', 'Missing check-in label', '{}', false),
  ('tenant.dashboard.employee.noShift', 'tenant-dashboard', 'No shift', 'Missing shift label', '{}', false),
  ('tenant.dashboard.attention.title', 'tenant-dashboard', 'Needs attention', 'Action queue title', '{}', false),
  ('tenant.dashboard.attention.subtitle', 'tenant-dashboard', 'Live operational queues', 'Action queue subtitle', '{}', false),
  ('tenant.dashboard.attention.regularizations', 'tenant-dashboard', 'Pending regularizations', 'Action queue item', '{}', false),
  ('tenant.dashboard.attention.security', 'tenant-dashboard', 'Security violations', 'Action queue item', '{}', false),
  ('tenant.dashboard.attention.absentee', 'tenant-dashboard', 'Absentee alerts', 'Action queue item', '{}', false),
  ('tenant.dashboard.attention.leave', 'tenant-dashboard', 'Leave approvals', 'Action queue item', '{}', false),
  ('tenant.dashboard.attention.devices', 'tenant-dashboard', 'Device requests', 'Action queue item', '{}', false),
  ('tenant.dashboard.attention.awaitingReview', 'tenant-dashboard', 'Requests awaiting review', 'Action queue help', '{}', false),
  ('tenant.dashboard.attention.openAlerts', 'tenant-dashboard', 'Open or acknowledged alerts', 'Action queue help', '{}', false),
  ('tenant.dashboard.attention.pastGrace', 'tenant-dashboard', 'Employees past alert grace', 'Action queue help', '{}', false),
  ('tenant.dashboard.attention.awaitingDecision', 'tenant-dashboard', 'Requests awaiting a decision', 'Action queue help', '{}', false),
  ('tenant.dashboard.attention.awaitingApproval', 'tenant-dashboard', 'Registrations awaiting approval', 'Action queue help', '{}', false),
  ('tenant.dashboard.attention.none', 'tenant-dashboard', 'No authorized action queues are waiting for you.', 'Empty action queue message', '{}', false),
  ('tenant.dashboard.attention.openRegister', 'tenant-dashboard', 'Open attendance register', 'Open attendance register action', '{}', false),
  ('attendance.status.all', 'attendance-status', 'All employees', 'All status filter', '{}', false),
  ('attendance.status.clockedIn', 'attendance-status', 'Clocked in', 'Attendance status', '{}', false),
  ('attendance.status.present', 'attendance-status', 'Present', 'Attendance status', '{}', false),
  ('attendance.status.late', 'attendance-status', 'Late', 'Attendance status', '{}', false),
  ('attendance.status.absent', 'attendance-status', 'Absent', 'Attendance status', '{}', false),
  ('attendance.status.onField', 'attendance-status', 'On field', 'Attendance status', '{}', false),
  ('attendance.status.onBreak', 'attendance-status', 'On break', 'Attendance status', '{}', false),
  ('attendance.status.notYetIn', 'attendance-status', 'Not yet in', 'Attendance status', '{}', false),
  ('attendance.status.off', 'attendance-status', 'Off', 'Attendance status', '{}', false),
  ('attendance.status.working', 'attendance-status', 'Working', 'Open attendance status', '{}', false),
  ('attendance.status.halfDay', 'attendance-status', 'Half day', 'Attendance status', '{}', false),
  ('attendance.status.onLeave', 'attendance-status', 'On leave', 'Attendance status', '{}', false),
  ('attendance.status.holiday', 'attendance-status', 'Holiday', 'Attendance status', '{}', false),
  ('attendance.status.weeklyOff', 'attendance-status', 'Weekly off', 'Attendance status', '{}', false),
  ('attendance.status.onDuty', 'attendance-status', 'On duty', 'Attendance status', '{}', false),
  ('attendance.status.workingDay', 'attendance-status', 'Working day', 'Attendance status', '{}', false),
  ('attendance.status.scheduled', 'attendance-status', 'Scheduled', 'Attendance status', '{}', false),
  ('attendance.status.notApplicable', 'attendance-status', 'Not applicable', 'Attendance status', '{}', false),
  ('attendance.self.title', 'tenant-dashboard', 'My attendance', 'Self attendance card title', '{}', false),
  ('attendance.self.shift', 'tenant-dashboard', 'Shift', 'Fallback shift name', '{}', false),
  ('attendance.self.worked', 'tenant-dashboard', 'Worked', 'Worked duration label', '{}', false),
  ('attendance.self.break', 'tenant-dashboard', 'Break', 'Break duration label', '{}', false),
  ('attendance.self.checkIn', 'tenant-dashboard', 'Check in', 'Check-in action', '{}', false),
  ('attendance.self.checkOut', 'tenant-dashboard', 'Check out', 'Check-out action', '{}', false),
  ('attendance.self.startBreak', 'tenant-dashboard', 'Start break', 'Start break action', '{}', false),
  ('attendance.self.endBreak', 'tenant-dashboard', 'End break', 'End break action', '{}', false),
  ('attendance.self.durationHours', 'tenant-dashboard', '{hours}h {minutes}m', 'Hours and minutes duration', '{"hours":"string","minutes":"string"}', false),
  ('attendance.self.durationMinutes', 'tenant-dashboard', '{minutes}m', 'Minutes duration', '{"minutes":"string"}', false),
  ('errors.dashboard.loadFailed', 'errors', 'Live attendance could not be loaded. Please try again.', 'Dashboard load failure', '{}', false),
  ('errors.dashboard.summaryFailed', 'errors', 'The HR action summary could not be loaded completely.', 'Dashboard summary failure', '{}', false),
  ('errors.dashboard.forbidden', 'errors', 'Your role does not include access to the workspace attendance dashboard.', 'Dashboard permission failure', '{}', false),
  ('errors.attendance.selfLoadFailed', 'errors', 'Your attendance state could not be loaded.', 'Self attendance load failure', '{}', false),
  ('errors.attendance.actionFailed', 'errors', 'This attendance action could not be completed.', 'Self attendance action failure', '{}', false),
  ('errors.generic', 'errors', 'Something went wrong. Please try again.', 'Generic localized error', '{}', false)
) AS source(key, namespace, message, description, placeholders, tenant_editable)
ON CONFLICT ("key") DO UPDATE SET
  "defaultMessage" = EXCLUDED."defaultMessage",
  "description" = EXCLUDED."description",
  "placeholderSchema" = EXCLUDED."placeholderSchema",
  "isTenantEditable" = EXCLUDED."isTenantEditable";

INSERT INTO "locale_translations" (
  "localePackId", "keyId", "value", "status", "reviewedAt"
)
SELECT pack.id, key.id, source.value, 'PUBLISHED', CURRENT_TIMESTAMP
FROM "locale_packs" pack
JOIN (VALUES
  ('common.action.retry', 'إعادة المحاولة'),
  ('common.action.close', 'إغلاق'),
  ('common.action.save', 'حفظ التغييرات'),
  ('common.action.open', 'فتح'),
  ('common.state.loading', 'جارٍ التحميل...'),
  ('common.state.saving', 'جارٍ الحفظ...'),
  ('common.state.live', 'مباشر'),
  ('common.state.stale', 'قد تكون البيانات غير محدّثة'),
  ('common.state.updatedSecondsAgo', 'تم التحديث منذ {seconds} ث'),
  ('tenant.shell.workspace', 'مساحة عمل DeltCRM'),
  ('tenant.shell.logout', 'تسجيل الخروج'),
  ('tenant.shell.notifications', 'الإشعارات'),
  ('tenant.shell.closeNavigation', 'إغلاق قائمة التنقل'),
  ('tenant.shell.openNavigation', 'فتح قائمة التنقل'),
  ('tenant.shell.workspaceUser', 'مستخدم مساحة العمل'),
  ('tenant.shell.contextNavigation', 'التنقل في {context}'),
  ('tenant.search.label', 'البحث عن موظفين أو إعدادات'),
  ('tenant.search.placeholder', 'ابحث عن موظفين أو إعدادات...'),
  ('tenant.search.employeeDirectory', 'دليل الموظفين'),
  ('tenant.search.organizationStructure', 'الهيكل التنظيمي'),
  ('tenant.search.employeeImport', 'استيراد الموظفين'),
  ('tenant.search.attendanceLeave', 'إجازات الحضور'),
  ('tenant.search.companySettings', 'إعدادات الشركة'),
  ('tenant.search.attendancePolicies', 'سياسات الحضور'),
  ('tenant.navigation.dashboard', 'لوحة المعلومات'),
  ('tenant.navigation.employees', 'الموظفون'),
  ('tenant.navigation.modules', 'الوحدات'),
  ('tenant.navigation.reports', 'التقارير'),
  ('tenant.navigation.settings', 'الإعدادات'),
  ('tenant.navigation.directory', 'الدليل'),
  ('tenant.navigation.organization', 'الهيكل التنظيمي'),
  ('tenant.navigation.bulkImport', 'الاستيراد الجماعي'),
  ('tenant.navigation.allModules', 'جميع الوحدات'),
  ('tenant.navigation.attendance', 'الحضور'),
  ('tenant.navigation.payroll', 'الرواتب'),
  ('tenant.navigation.reportCenter', 'مركز التقارير'),
  ('tenant.navigation.attendanceReports', 'تقارير الحضور'),
  ('tenant.navigation.payrollReports', 'تقارير الرواتب'),
  ('tenant.navigation.settingsHome', 'الصفحة الرئيسية للإعدادات'),
  ('tenant.navigation.company', 'الشركة'),
  ('tenant.navigation.adminAccess', 'صلاحيات الإدارة'),
  ('tenant.navigation.security', 'الأمان'),
  ('tenant.navigation.notifications', 'الإشعارات'),
  ('tenant.navigation.integrations', 'التكاملات'),
  ('tenant.navigation.auditHistory', 'سجل التدقيق'),
  ('tenant.navigation.billing', 'الفوترة'),
  ('tenant.navigation.localization', 'اللغة والتوطين'),
  ('tenant.dashboard.header.today', 'اليوم'),
  ('tenant.dashboard.header.eyebrow', 'عمليات مساحة العمل'),
  ('tenant.dashboard.header.title', 'عمليات الموارد البشرية'),
  ('tenant.dashboard.header.welcome', 'مرحباً، {name}. راجع قوى العمل اليوم وكل قائمة تتطلب إجراءً.'),
  ('tenant.dashboard.employee.workspace', 'مساحة عمل الموظف'),
  ('tenant.dashboard.employee.workspaceBody', 'سجّل يوم عملك وراجع الحالة المؤكدة من الخادم.'),
  ('tenant.dashboard.header.greeting', 'مرحباً، {name}'),
  ('tenant.dashboard.connecting', 'جارٍ الاتصال بلوحة البيانات المباشرة...'),
  ('tenant.dashboard.overview.title', 'نظرة عامة على مساحة العمل'),
  ('tenant.dashboard.overview.aria', 'نظرة عامة لمسؤول الأعمال'),
  ('tenant.dashboard.overview.subtitle', 'ضوابط مسؤول الأعمال وجاهزية مساحة العمل'),
  ('tenant.dashboard.overview.ownerView', 'عرض المالك'),
  ('tenant.dashboard.overview.employeeUsage', 'استخدام الموظفين'),
  ('tenant.dashboard.overview.availableSeats', '{percent}% من المقاعد المتاحة'),
  ('tenant.dashboard.overview.quotaUnavailable', 'الحصة غير متاحة'),
  ('tenant.dashboard.overview.workspaceSetup', 'إعداد مساحة العمل'),
  ('tenant.dashboard.overview.ready', 'جاهز'),
  ('tenant.dashboard.overview.needsSetup', 'يحتاج إلى إعداد'),
  ('tenant.dashboard.overview.setupReadyBody', 'مدخلات المؤسسة والحضور المطلوبة متوفرة'),
  ('tenant.dashboard.overview.setupMissingBody', 'افتح حالة الإعداد لمعالجة النواقص'),
  ('tenant.dashboard.overview.enabledModules', 'الوحدات المفعّلة'),
  ('tenant.dashboard.overview.noModules', 'لم يتم الإبلاغ عن وحدات'),
  ('tenant.dashboard.overview.workspaceUsers', 'مستخدمو مساحة العمل'),
  ('tenant.dashboard.overview.userAccessDetail', '{pending} دعوات معلّقة · {unavailable} غير متاحين'),
  ('tenant.dashboard.overview.userAccessUnavailable', 'بيانات وصول المستخدمين غير متاحة'),
  ('tenant.dashboard.workforce.title', 'القوى العاملة'),
  ('tenant.dashboard.workforce.summary', 'ملخص القوى العاملة'),
  ('tenant.dashboard.workforce.scope', 'تتبع الأعداد نطاق تقارير الموظفين المسموح لك به'),
  ('tenant.dashboard.workforce.openDirectory', 'فتح الدليل'),
  ('tenant.dashboard.workforce.active', 'القوى العاملة النشطة'),
  ('tenant.dashboard.workforce.onNotice', 'في فترة الإشعار'),
  ('tenant.dashboard.workforce.joiningSoon', 'المنضمون خلال 30 يوماً'),
  ('tenant.dashboard.workforce.missingManager', 'بلا مدير محدد'),
  ('tenant.dashboard.workforce.former', 'الموظفون السابقون'),
  ('tenant.dashboard.attendanceSummary', 'ملخص الحضور'),
  ('tenant.dashboard.search.label', 'البحث في موظفي لوحة المعلومات'),
  ('tenant.dashboard.search.placeholder', 'ابحث عن موظفين...'),
  ('tenant.dashboard.view.grid', 'عرض شبكي'),
  ('tenant.dashboard.view.list', 'عرض قائمة'),
  ('tenant.dashboard.empty.title', 'لا يوجد موظفون مطابقون لهذا العرض'),
  ('tenant.dashboard.empty.body', 'جرّب حالة أخرى أو امسح عبارة البحث.'),
  ('tenant.dashboard.employee.openProfile', 'فتح ملف الموظف {name}'),
  ('tenant.dashboard.employee.checkedInAt', 'الدخول {time}'),
  ('tenant.dashboard.employee.noCheckin', 'لا يوجد تسجيل دخول'),
  ('tenant.dashboard.employee.noShift', 'لا توجد وردية'),
  ('tenant.dashboard.attention.title', 'يتطلب اهتمامك'),
  ('tenant.dashboard.attention.subtitle', 'قوائم تشغيلية مباشرة'),
  ('tenant.dashboard.attention.regularizations', 'طلبات تصحيح الحضور المعلّقة'),
  ('tenant.dashboard.attention.security', 'مخالفات الأمان'),
  ('tenant.dashboard.attention.absentee', 'تنبيهات الغياب'),
  ('tenant.dashboard.attention.leave', 'موافقات الإجازات'),
  ('tenant.dashboard.attention.devices', 'طلبات الأجهزة'),
  ('tenant.dashboard.attention.awaitingReview', 'طلبات بانتظار المراجعة'),
  ('tenant.dashboard.attention.openAlerts', 'تنبيهات مفتوحة أو تم الإقرار بها'),
  ('tenant.dashboard.attention.pastGrace', 'موظفون تجاوزوا مهلة التنبيه'),
  ('tenant.dashboard.attention.awaitingDecision', 'طلبات بانتظار القرار'),
  ('tenant.dashboard.attention.awaitingApproval', 'تسجيلات بانتظار الموافقة'),
  ('tenant.dashboard.attention.none', 'لا توجد قوائم إجراءات مصرح بها بانتظارك.'),
  ('tenant.dashboard.attention.openRegister', 'فتح سجل الحضور'),
  ('attendance.status.all', 'جميع الموظفين'),
  ('attendance.status.clockedIn', 'تم تسجيل الدخول'),
  ('attendance.status.present', 'حاضر'),
  ('attendance.status.late', 'متأخر'),
  ('attendance.status.absent', 'غائب'),
  ('attendance.status.onField', 'في الميدان'),
  ('attendance.status.onBreak', 'في استراحة'),
  ('attendance.status.notYetIn', 'لم يحضر بعد'),
  ('attendance.status.off', 'إجازة'),
  ('attendance.status.working', 'قيد العمل'),
  ('attendance.status.halfDay', 'نصف يوم'),
  ('attendance.status.onLeave', 'في إجازة'),
  ('attendance.status.holiday', 'عطلة رسمية'),
  ('attendance.status.weeklyOff', 'راحة أسبوعية'),
  ('attendance.status.onDuty', 'في مهمة عمل'),
  ('attendance.status.workingDay', 'يوم عمل'),
  ('attendance.status.scheduled', 'مجدول'),
  ('attendance.status.notApplicable', 'غير منطبق'),
  ('attendance.self.title', 'حضوري'),
  ('attendance.self.shift', 'الوردية'),
  ('attendance.self.worked', 'مدة العمل'),
  ('attendance.self.break', 'الاستراحة'),
  ('attendance.self.checkIn', 'تسجيل الحضور'),
  ('attendance.self.checkOut', 'تسجيل الانصراف'),
  ('attendance.self.startBreak', 'بدء الاستراحة'),
  ('attendance.self.endBreak', 'إنهاء الاستراحة'),
  ('attendance.self.durationHours', '{hours} س {minutes} د'),
  ('attendance.self.durationMinutes', '{minutes} د'),
  ('errors.dashboard.loadFailed', 'تعذر تحميل بيانات الحضور المباشرة. يرجى المحاولة مرة أخرى.'),
  ('errors.dashboard.summaryFailed', 'تعذر تحميل ملخص إجراءات الموارد البشرية بالكامل.'),
  ('errors.dashboard.forbidden', 'لا يتضمن دورك صلاحية الوصول إلى لوحة حضور مساحة العمل.'),
  ('errors.attendance.selfLoadFailed', 'تعذر تحميل حالة حضورك.'),
  ('errors.attendance.actionFailed', 'تعذر إكمال إجراء الحضور.'),
  ('errors.generic', 'حدث خطأ ما. يرجى المحاولة مرة أخرى.')
) AS source(key, value) ON true
JOIN "localization_keys" key ON key.key = source.key
WHERE pack.locale = 'ar' AND pack.version = 1
ON CONFLICT ("localePackId", "keyId") DO UPDATE SET
  value = EXCLUDED.value,
  status = 'PUBLISHED';

-- =====================================================================
-- rls-and-partitions.sql
-- Raw SQL migration run AFTER `prisma migrate` (keep it in
-- prisma/migrations/<ts>_rls_and_partitions/migration.sql so it is
-- versioned and applied by `prisma migrate deploy` like any other).
--
-- Covers the four things Prisma cannot express:
--   1. Row-Level Security (tenant isolation, defense-in-depth layer 3)
--   2. Monthly partitioning for the three high-volume tables
--   3. Partial unique indexes (one primary device, one default policy)
--   4. Append-only enforcement on audit logs
-- =====================================================================

-- Automatically initialize required database roles if they do not exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN 
    CREATE ROLE app_user LOGIN PASSWORD 'app_password'; 
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_admin') THEN 
    CREATE ROLE app_admin LOGIN PASSWORD 'admin_password' BYPASSRLS SUPERUSER; 
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'platform_runtime') THEN 
    CREATE ROLE platform_runtime LOGIN PASSWORD 'platform_password'; 
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 1. Row-Level Security
--    Every request/job sets:  SET LOCAL app."tenantId" = '<uuid>'
--    (see tenancy.extension.ts). Missing setting => predicate is
--    NULL => zero rows. Fail closed, exactly as we want.
-- ---------------------------------------------------------------
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'tenant_settings',
    'tenant_billing_profiles',
    'users',
    'roles',
    'verification_tokens',
    'departments',
    'designations',
    'employees',
    'employment_events',
    'import_jobs',
    'office_locations',
    'employee_office_assignments',
    'policy_assignments',
    'shifts',
    'employee_shift_rosters',
    'tenant_holidays',
    'registered_devices',
    'attendance_logs',
    'attendance_events',
    'attendance_verification_logs',
    'attendance_exceptions',
    'regularization_requests',
    'field_tracking_sessions',
    'field_location_pings',
    'field_route_summaries',
    'biometric_consents',
    'tenant_audit_logs',
    'report_exports',
    'payroll_lock_periods',
    'leave_balances',
    'leave_requests',
    'notifications',
    'notification_preferences'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- FORCE: applies even to the table owner — closes a classic loophole
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
        WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid)
    $f$, t);
  END LOOP;
END $$;

-- roles table: system roles ("tenantId" IS NULL) must be readable by all
DROP POLICY IF EXISTS tenant_isolation ON roles;
CREATE POLICY tenant_isolation ON roles
  USING ("tenantId" IS NULL
         OR "tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------
-- 2. Partitioning (declarative, monthly). Prisma created plain
--    tables; convert the hot three. Do this BEFORE production data
--    exists — afterwards it is a table-rewrite migration.
--    Pattern shown for attendance_events; repeat verbatim for
--    attendance_verification_logs (verified_at),
--    field_location_pings (captured_at), tenant_audit_logs (created_at).
-- ---------------------------------------------------------------
ALTER TABLE attendance_events RENAME TO attendance_events_old;

CREATE TABLE attendance_events (
  LIKE attendance_events_old INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE ("eventTime");

-- PK must include the partition key on partitioned tables
ALTER TABLE attendance_events ADD PRIMARY KEY (id, "eventTime");
CREATE UNIQUE INDEX ae_client_uuid_uq
  ON attendance_events ("tenantId", "employeeId", "clientEventUuid", "eventTime")
  WHERE "clientEventUuid" IS NOT NULL;
CREATE INDEX ae_tenant_emp_time_idx
  ON attendance_events ("tenantId", "employeeId", "eventTime");

-- initial partitions + a default catch-all (monitored: rows here = ops bug)
CREATE TABLE attendance_events_2026_07 PARTITION OF attendance_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE attendance_events_2026_08 PARTITION OF attendance_events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE attendance_events_default PARTITION OF attendance_events DEFAULT;

INSERT INTO attendance_events SELECT * FROM attendance_events_old;
DROP TABLE attendance_events_old;

-- Re-attach RLS (partitioned parent needs its own enablement)
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attendance_events
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);

-- Ongoing partition creation: use pg_partman, or a monthly BullMQ job
-- running: CREATE TABLE IF NOT EXISTS attendance_events_YYYY_MM ...

-- ---------------------------------------------------------------
-- 3. Partial unique indexes Prisma can't declare
-- ---------------------------------------------------------------
-- one primary device per employee
CREATE UNIQUE INDEX rd_one_primary_per_employee
  ON registered_devices ("tenantId", "employeeId")
  WHERE "isPrimary" = true AND status = 'ACTIVE';

-- one TENANT_DEFAULT policy per tenant
CREATE UNIQUE INDEX pa_one_tenant_default
  ON policy_assignments ("tenantId")
  WHERE scope = 'TENANT_DEFAULT';

-- one policy per department / per employee
CREATE UNIQUE INDEX pa_one_per_dept
  ON policy_assignments ("tenantId", "deptId")
  WHERE scope = 'DEPARTMENT';
CREATE UNIQUE INDEX pa_one_per_employee
  ON policy_assignments ("tenantId", "employeeId")
  WHERE scope = 'EMPLOYEE';

-- ---------------------------------------------------------------
-- 4. Append-only audit logs: revoke mutation from the app role
-- ---------------------------------------------------------------
REVOKE UPDATE, DELETE ON tenant_audit_logs FROM app_user;
-- (system_audit_logs likewise, from the platform role's writer)

-- ---------------------------------------------------------------
-- 5. The CI gate (pseudo, lives in an integration test, shown here
--    so the intent is versioned with the policy):
--
--    BEGIN; SET LOCAL app."tenantId" = '<tenant A>';
--    SELECT count(*) FROM employees WHERE "tenantId" = '<tenant B>';
--    -- MUST return 0. If it ever returns >0, fail the build.
-- ---------------------------------------------------------------

-- Sprint 4 attendance runtime durability, authorization, and hot-path indexes.

ALTER TABLE attendance_exceptions
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT now();

CREATE TABLE attendance_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "jobType" text NOT NULL,
  "attendanceDate" date NOT NULL,
  "idempotencyKey" text NOT NULL,
  status "JobStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" integer NOT NULL DEFAULT 0,
  "startedAt" timestamptz,
  "completedAt" timestamptz,
  "lastError" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX attendance_job_runs_idempotency_uq
  ON attendance_job_runs ("tenantId", "idempotencyKey");
CREATE INDEX attendance_job_runs_execution_idx
  ON attendance_job_runs ("tenantId", "jobType", "attendanceDate", status);
CREATE INDEX attendance_logs_employee_date_idx
  ON attendance_logs ("tenantId", "employeeId", "attendanceDate" DESC);
CREATE INDEX attendance_exceptions_range_idx
  ON attendance_exceptions ("tenantId", "startDate", "endDate", "employeeId");

ALTER TABLE attendance_job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_job_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attendance_job_runs
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_job_runs TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_job_runs TO platform_runtime;

-- Events are immutable evidence. The app may append and read, never rewrite history.
REVOKE UPDATE, DELETE ON attendance_events FROM app_user;

INSERT INTO permissions (id, key)
SELECT gen_random_uuid(), permission_key
FROM unnest(ARRAY[
  'attendance.exceptions.read',
  'attendance.exceptions.manage'
]) AS permission_key
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions ("roleId", "permissionId")
SELECT role.id, permission.id
FROM roles role
JOIN permissions permission
  ON permission.key IN (
    'attendance.exceptions.read',
    'attendance.exceptions.manage'
  )
WHERE role.name IN ('BUSINESS_ADMIN', 'HR_ADMIN')
  AND role."isSystem" = true
ON CONFLICT DO NOTHING;

-- Keep two future partitions ahead of the July 2026 runtime boundary.
CREATE TABLE IF NOT EXISTS attendance_events_2026_09
  PARTITION OF attendance_events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS attendance_events_2026_10
  PARTITION OF attendance_events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

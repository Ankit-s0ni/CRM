CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "ReportFormat" AS ENUM ('CSV', 'XLSX', 'PDF');
CREATE TYPE "PayrollLockAction" AS ENUM ('LOCKED', 'REOPENED');
CREATE TYPE "LeaveBalanceEntryType" AS ENUM ('CREDIT', 'DEBIT', 'RESTORE', 'ADJUSTMENT');

ALTER TABLE regularization_requests
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE regularization_requests
SET "idempotencyKey" = 'legacy:' || id::text
WHERE "idempotencyKey" IS NULL;

ALTER TABLE regularization_requests
  ALTER COLUMN "idempotencyKey" SET NOT NULL,
  ADD CONSTRAINT regularization_requests_attendance_log_fk
    FOREIGN KEY ("attendanceLogId") REFERENCES attendance_logs(id),
  ADD CONSTRAINT regularization_requests_employee_fk
    FOREIGN KEY ("employeeId") REFERENCES employees(id);

CREATE UNIQUE INDEX regularization_requests_day_unique
  ON regularization_requests ("tenantId", "employeeId", "attendanceLogId");
CREATE UNIQUE INDEX regularization_requests_idempotency_unique
  ON regularization_requests ("tenantId", "employeeId", "idempotencyKey");

ALTER TABLE report_exports
  ADD COLUMN format "ReportFormat" NOT NULL DEFAULT 'CSV',
  ADD COLUMN "contractVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "sourceCutoff" TIMESTAMP(3),
  ADD COLUMN "sourceWatermark" TEXT,
  ADD COLUMN "objectKey" TEXT,
  ADD COLUMN checksum TEXT,
  ADD COLUMN "failureCode" TEXT,
  ADD COLUMN "failureMessage" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE report_exports
SET "sourceCutoff" = "createdAt"
WHERE "sourceCutoff" IS NULL;

ALTER TABLE report_exports
  ALTER COLUMN "sourceCutoff" SET NOT NULL,
  ADD CONSTRAINT report_exports_requester_fk
    FOREIGN KEY ("requestedBy") REFERENCES users(id);

CREATE INDEX report_exports_status_idx
  ON report_exports ("tenantId", status, "createdAt");

ALTER TABLE payroll_lock_periods
  ADD CONSTRAINT payroll_lock_periods_export_fk
    FOREIGN KEY ("exportId") REFERENCES report_exports(id);

CREATE TABLE payroll_lock_history (
  id UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "payrollLockId" UUID NOT NULL,
  action "PayrollLockAction" NOT NULL,
  "actorUserId" UUID NOT NULL,
  reason TEXT,
  "exportId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payroll_lock_history_lock_fk
    FOREIGN KEY ("payrollLockId") REFERENCES payroll_lock_periods(id)
);

CREATE INDEX payroll_lock_history_tenant_lock_idx
  ON payroll_lock_history ("tenantId", "payrollLockId", "createdAt");

ALTER TABLE leave_policies
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE leave_balances
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT leave_balances_employee_fk
    FOREIGN KEY ("employeeId") REFERENCES employees(id);

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_employee_fk
    FOREIGN KEY ("employeeId") REFERENCES employees(id);

CREATE INDEX leave_requests_employee_range_idx
  ON leave_requests ("tenantId", "employeeId", "startDate", "endDate");

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_no_active_overlap
  EXCLUDE USING gist (
    "tenantId" WITH =,
    "employeeId" WITH =,
    daterange("startDate", "endDate", '[]') WITH &&
  ) WHERE (status IN ('PENDING', 'APPROVED'));

CREATE TABLE leave_balance_ledger (
  id UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "balanceId" UUID NOT NULL,
  "leaveRequestId" UUID,
  "entryType" "LeaveBalanceEntryType" NOT NULL,
  days DECIMAL(5,2) NOT NULL,
  "balanceAfter" DECIMAL(5,2) NOT NULL,
  reason TEXT NOT NULL,
  "actorUserId" UUID,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_balance_ledger_balance_fk
    FOREIGN KEY ("balanceId") REFERENCES leave_balances(id),
  CONSTRAINT leave_balance_ledger_request_fk
    FOREIGN KEY ("leaveRequestId") REFERENCES leave_requests(id)
);

CREATE UNIQUE INDEX leave_balance_ledger_idempotency_unique
  ON leave_balance_ledger ("tenantId", "idempotencyKey");
CREATE INDEX leave_balance_ledger_balance_idx
  ON leave_balance_ledger ("tenantId", "balanceId", "createdAt");

ALTER TABLE notification_templates
  ADD COLUMN "requiredVariables" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_user_fk
    FOREIGN KEY ("userId") REFERENCES users(id);

ALTER TABLE notifications
  ADD COLUMN "dedupeKey" TEXT;

UPDATE notifications
SET "dedupeKey" = 'legacy:' || id::text
WHERE "dedupeKey" IS NULL;

ALTER TABLE notifications
  ALTER COLUMN "dedupeKey" SET NOT NULL,
  ADD CONSTRAINT notifications_user_fk
    FOREIGN KEY ("userId") REFERENCES users(id);

CREATE UNIQUE INDEX notifications_dedupe_unique
  ON notifications ("tenantId", "userId", "dedupeKey");

ALTER TABLE notification_deliveries
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "providerCode" TEXT,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

CREATE UNIQUE INDEX notification_delivery_attempt_unique
  ON notification_deliveries (
    "notificationId",
    channel,
    COALESCE("deviceId", '00000000-0000-0000-0000-000000000000'::uuid),
    "attemptNumber"
  );

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'regularization_requests',
    'report_exports',
    'payroll_lock_periods',
    'payroll_lock_history',
    'leave_policies',
    'leave_balances',
    'leave_balance_ledger',
    'leave_requests',
    'notification_preferences',
    'notifications'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON notification_deliveries;
CREATE POLICY tenant_isolation ON notification_deliveries
  USING (
    EXISTS (
      SELECT 1
      FROM notifications
      WHERE notifications.id = notification_deliveries."notificationId"
        AND notifications."tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM notifications
      WHERE notifications.id = notification_deliveries."notificationId"
        AND notifications."tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON
  regularization_requests,
  report_exports,
  payroll_lock_periods,
  leave_policies,
  leave_balances,
  leave_requests,
  notification_preferences,
  notifications
TO app_user;

GRANT SELECT, INSERT ON
  payroll_lock_history,
  leave_balance_ledger,
  notification_deliveries
TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  regularization_requests,
  report_exports,
  payroll_lock_periods,
  payroll_lock_history,
  leave_policies,
  leave_balances,
  leave_balance_ledger,
  leave_requests,
  notification_preferences,
  notifications,
  notification_deliveries
TO platform_runtime;

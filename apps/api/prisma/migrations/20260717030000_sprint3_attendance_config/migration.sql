-- Sprint 3 tenant settings and attendance configuration hardening.
ALTER TABLE tenant_settings
  ADD COLUMN "companyLogoKey" text,
  ADD COLUMN "workingDayStart" text NOT NULL DEFAULT '09:00',
  ADD COLUMN "workingDayEnd" text NOT NULL DEFAULT '18:00',
  ADD COLUMN "onboardingStep" integer NOT NULL DEFAULT 1;

ALTER TABLE import_jobs ADD COLUMN "idempotencyKey" text;
CREATE UNIQUE INDEX import_jobs_tenant_kind_idempotency_uq
  ON import_jobs ("tenantId", kind, "idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

CREATE TABLE roster_import_rows (
  id uuid PRIMARY KEY,
  "tenantId" uuid NOT NULL,
  "importJobId" uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  "rowNumber" integer NOT NULL,
  "idempotencyKey" text NOT NULL,
  "rawData" jsonb NOT NULL,
  "normalizedData" jsonb,
  status "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
  "errorCode" text,
  "errorMessage" text,
  "employeeId" uuid,
  "shiftId" uuid,
  "rosterId" uuid,
  "attemptCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX roster_import_rows_job_row_uq
  ON roster_import_rows ("tenantId", "importJobId", "rowNumber");
CREATE UNIQUE INDEX roster_import_rows_idempotency_uq
  ON roster_import_rows ("tenantId", "idempotencyKey");
CREATE INDEX roster_import_rows_status_idx
  ON roster_import_rows ("tenantId", "importJobId", status);

DROP INDEX IF EXISTS "office_locations_tenantId_officeName_key";
DROP INDEX IF EXISTS "attendance_policies_tenantId_name_key";
DROP INDEX IF EXISTS "shifts_tenantId_name_key";

CREATE UNIQUE INDEX office_locations_name_ci_uq
  ON office_locations ("tenantId", lower("officeName"));
CREATE UNIQUE INDEX attendance_policies_name_ci_uq
  ON attendance_policies ("tenantId", lower(name));
CREATE UNIQUE INDEX shifts_name_ci_uq
  ON shifts ("tenantId", lower(name));

CREATE UNIQUE INDEX employee_office_one_primary_uq
  ON employee_office_assignments ("tenantId", "employeeId")
  WHERE "isPrimary" = true;

ALTER TABLE policy_assignments
  ADD CONSTRAINT policy_assignment_scope_target_ck CHECK (
    (scope = 'TENANT_DEFAULT' AND "deptId" IS NULL AND "employeeId" IS NULL) OR
    (scope = 'DEPARTMENT' AND "deptId" IS NOT NULL AND "employeeId" IS NULL) OR
    (scope = 'EMPLOYEE' AND "deptId" IS NULL AND "employeeId" IS NOT NULL)
  );

ALTER TABLE roster_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_import_rows FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON roster_import_rows
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_policies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON attendance_policies;
CREATE POLICY tenant_isolation ON attendance_policies
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON roster_import_rows TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON roster_import_rows TO platform_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_policies TO app_user;

-- Prevent foreign IDs from crossing tenant boundaries even when service checks regress.
CREATE OR REPLACE FUNCTION enforce_sprint3_tenant_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE referenced_tenant uuid;
BEGIN
  IF TG_TABLE_NAME = 'employee_office_assignments' THEN
    SELECT "tenantId" INTO referenced_tenant FROM employees WHERE id = NEW."employeeId";
    IF referenced_tenant IS DISTINCT FROM NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant employee reference'; END IF;
    SELECT "tenantId" INTO referenced_tenant FROM office_locations WHERE id = NEW."officeLocationId";
    IF referenced_tenant IS DISTINCT FROM NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant office reference'; END IF;
  ELSIF TG_TABLE_NAME = 'policy_assignments' THEN
    SELECT "tenantId" INTO referenced_tenant FROM attendance_policies WHERE id = NEW."policyId";
    IF referenced_tenant IS DISTINCT FROM NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant policy reference'; END IF;
    IF NEW."deptId" IS NOT NULL THEN
      SELECT "tenantId" INTO referenced_tenant FROM departments WHERE id = NEW."deptId";
      IF referenced_tenant IS DISTINCT FROM NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant department reference'; END IF;
    END IF;
    IF NEW."employeeId" IS NOT NULL THEN
      SELECT "tenantId" INTO referenced_tenant FROM employees WHERE id = NEW."employeeId";
      IF referenced_tenant IS DISTINCT FROM NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant employee reference'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'employee_shift_rosters' THEN
    SELECT "tenantId" INTO referenced_tenant FROM employees WHERE id = NEW."employeeId";
    IF referenced_tenant IS DISTINCT FROM NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant employee reference'; END IF;
    SELECT "tenantId" INTO referenced_tenant FROM shifts WHERE id = NEW."shiftId";
    IF referenced_tenant IS DISTINCT FROM NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant shift reference'; END IF;
  ELSIF TG_TABLE_NAME = 'tenant_holidays' AND NEW."officeLocationId" IS NOT NULL THEN
    SELECT "tenantId" INTO referenced_tenant FROM office_locations WHERE id = NEW."officeLocationId";
    IF referenced_tenant IS DISTINCT FROM NEW."tenantId" THEN RAISE EXCEPTION 'cross-tenant office reference'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER employee_office_tenant_match
  BEFORE INSERT OR UPDATE ON employee_office_assignments
  FOR EACH ROW EXECUTE FUNCTION enforce_sprint3_tenant_reference();
CREATE TRIGGER policy_assignment_tenant_match
  BEFORE INSERT OR UPDATE ON policy_assignments
  FOR EACH ROW EXECUTE FUNCTION enforce_sprint3_tenant_reference();
CREATE TRIGGER roster_tenant_match
  BEFORE INSERT OR UPDATE ON employee_shift_rosters
  FOR EACH ROW EXECUTE FUNCTION enforce_sprint3_tenant_reference();
CREATE TRIGGER holiday_tenant_match
  BEFORE INSERT OR UPDATE ON tenant_holidays
  FOR EACH ROW EXECUTE FUNCTION enforce_sprint3_tenant_reference();

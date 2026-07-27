ALTER TYPE "PayrollRunBlockerSeverity" ADD VALUE IF NOT EXISTS 'INFO';

CREATE TYPE "PayrollInputImportStatus" AS ENUM ('PREVIEW_READY', 'COMMITTED', 'FAILED');
CREATE TYPE "PayrollValidationIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'OBSOLETE');

ALTER TABLE "payroll_runs" ADD COLUMN "inputVersion" integer NOT NULL DEFAULT 1;
ALTER TABLE "payroll_runs" ADD COLUMN "lastValidatedAt" timestamp(3);
ALTER TABLE "payroll_runs" ADD COLUMN "readiness" jsonb NOT NULL DEFAULT '{}';
ALTER TABLE "payroll_run_inputs" ADD COLUMN "importId" uuid;

CREATE TABLE "payroll_input_imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "status" "PayrollInputImportStatus" NOT NULL DEFAULT 'PREVIEW_READY',
  "fileName" text,
  "checksum" text NOT NULL,
  "rowCount" integer NOT NULL DEFAULT 0,
  "validRowCount" integer NOT NULL DEFAULT 0,
  "errorCount" integer NOT NULL DEFAULT 0,
  "previewRows" jsonb NOT NULL DEFAULT '[]',
  "errors" jsonb NOT NULL DEFAULT '[]',
  "committedAt" timestamp(3),
  "createdBy" uuid NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_validation_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "inputVersion" integer NOT NULL,
  "attendanceChecksum" text,
  "blockerCount" integer NOT NULL DEFAULT 0,
  "warningCount" integer NOT NULL DEFAULT 0,
  "infoCount" integer NOT NULL DEFAULT 0,
  "readiness" jsonb NOT NULL DEFAULT '{}',
  "createdBy" uuid NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_validation_issues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "validationRunId" uuid,
  "employeeId" uuid,
  "severity" "PayrollRunBlockerSeverity" NOT NULL,
  "status" "PayrollValidationIssueStatus" NOT NULL DEFAULT 'OPEN',
  "code" text NOT NULL,
  "message" text NOT NULL,
  "context" jsonb NOT NULL DEFAULT '{}',
  "acknowledgedAt" timestamp(3),
  "acknowledgedBy" uuid,
  "resolvedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "payroll_input_imports" ADD CONSTRAINT "payroll_input_imports_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_run_inputs" ADD CONSTRAINT "payroll_run_inputs_importId_fkey" FOREIGN KEY ("importId") REFERENCES "payroll_input_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_validation_runs" ADD CONSTRAINT "payroll_validation_runs_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_validation_issues" ADD CONSTRAINT "payroll_validation_issues_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_validation_issues" ADD CONSTRAINT "payroll_validation_issues_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "payroll_validation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "payroll_input_imports_tenantId_payrollRunId_checksum_key" ON "payroll_input_imports"("tenantId", "payrollRunId", "checksum");
CREATE INDEX "payroll_input_imports_tenantId_payrollRunId_status_idx" ON "payroll_input_imports"("tenantId", "payrollRunId", "status");
CREATE INDEX "payroll_run_inputs_tenantId_importId_idx" ON "payroll_run_inputs"("tenantId", "importId");
CREATE INDEX "payroll_validation_runs_tenantId_payrollRunId_createdAt_idx" ON "payroll_validation_runs"("tenantId", "payrollRunId", "createdAt");
CREATE INDEX "payroll_validation_issues_tenantId_payrollRunId_severity_status_idx" ON "payroll_validation_issues"("tenantId", "payrollRunId", "severity", "status");
CREATE INDEX "payroll_validation_issues_tenantId_validationRunId_idx" ON "payroll_validation_issues"("tenantId", "validationRunId");

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_input_imports',
    'payroll_validation_runs',
    'payroll_validation_issues'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO app_user USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO app_user', table_name);
  END LOOP;
END $$;

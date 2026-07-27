CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'VALIDATING', 'INPUTS_READY', 'CANCELLED');
CREATE TYPE "PayrollRunBlockerSeverity" AS ENUM ('BLOCKER', 'WARNING');
CREATE TYPE "PayrollInputKind" AS ENUM ('RECURRING', 'ONE_TIME', 'JOINER', 'LEAVER');

CREATE TABLE "payroll_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payGroupId" uuid NOT NULL,
  "periodKey" text NOT NULL,
  "periodStart" date NOT NULL,
  "periodEnd" date NOT NULL,
  "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
  "attendanceSource" text,
  "attendanceChecksum" text,
  "attendanceVersion" text,
  "idempotencyKey" text,
  "createdBy" uuid NOT NULL,
  "updatedBy" uuid,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_run_employees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "employeeId" uuid NOT NULL,
  "employeePayrollProfileId" uuid,
  "attendanceSnapshot" jsonb NOT NULL DEFAULT '{}',
  "payableDays" integer,
  "lossOfPayDays" integer,
  "overtimeMinutes" integer,
  "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_run_inputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "employeeId" uuid,
  "kind" "PayrollInputKind" NOT NULL,
  "code" text NOT NULL,
  "amountMinor" bigint,
  "quantity" decimal(12,3),
  "currency" text,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "source" text,
  "idempotencyKey" text,
  "createdBy" uuid NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_run_blockers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "employeeId" uuid,
  "severity" "PayrollRunBlockerSeverity" NOT NULL,
  "code" text NOT NULL,
  "message" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_run_timeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "action" text NOT NULL,
  "actorUserId" uuid,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payGroupId_fkey" FOREIGN KEY ("payGroupId") REFERENCES "pay_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_run_employees" ADD CONSTRAINT "payroll_run_employees_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_run_employees" ADD CONSTRAINT "payroll_run_employees_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_run_employees" ADD CONSTRAINT "payroll_run_employees_employeePayrollProfileId_fkey" FOREIGN KEY ("employeePayrollProfileId") REFERENCES "employee_payroll_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_run_inputs" ADD CONSTRAINT "payroll_run_inputs_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_run_blockers" ADD CONSTRAINT "payroll_run_blockers_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_run_timeline" ADD CONSTRAINT "payroll_run_timeline_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "payroll_runs_tenantId_payGroupId_periodKey_key" ON "payroll_runs"("tenantId", "payGroupId", "periodKey");
CREATE UNIQUE INDEX "payroll_runs_tenantId_idempotencyKey_key" ON "payroll_runs"("tenantId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE INDEX "payroll_runs_tenantId_status_periodStart_periodEnd_idx" ON "payroll_runs"("tenantId", "status", "periodStart", "periodEnd");
CREATE UNIQUE INDEX "payroll_run_employees_tenantId_payrollRunId_employeeId_key" ON "payroll_run_employees"("tenantId", "payrollRunId", "employeeId");
CREATE INDEX "payroll_run_employees_tenantId_payrollRunId_status_idx" ON "payroll_run_employees"("tenantId", "payrollRunId", "status");
CREATE UNIQUE INDEX "payroll_run_inputs_tenantId_payrollRunId_idempotencyKey_key" ON "payroll_run_inputs"("tenantId", "payrollRunId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE INDEX "payroll_run_inputs_tenantId_payrollRunId_employeeId_kind_idx" ON "payroll_run_inputs"("tenantId", "payrollRunId", "employeeId", "kind");
CREATE INDEX "payroll_run_blockers_tenantId_payrollRunId_severity_idx" ON "payroll_run_blockers"("tenantId", "payrollRunId", "severity");
CREATE INDEX "payroll_run_timeline_tenantId_payrollRunId_createdAt_idx" ON "payroll_run_timeline"("tenantId", "payrollRunId", "createdAt");

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_runs',
    'payroll_run_employees',
    'payroll_run_inputs',
    'payroll_run_blockers',
    'payroll_run_timeline'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO app_user USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO app_user', table_name);
  END LOOP;
END $$;

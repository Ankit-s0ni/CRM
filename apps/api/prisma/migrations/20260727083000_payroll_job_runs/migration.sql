CREATE TYPE "PayrollJobKind" AS ENUM ('CALCULATION', 'OUTPUT_GENERATION', 'PAYMENT_RECORDING');

CREATE TABLE "payroll_job_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "kind" "PayrollJobKind" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "progress" integer NOT NULL DEFAULT 0,
  "idempotencyKey" text,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "error" jsonb,
  "startedAt" timestamp(3),
  "completedAt" timestamp(3),
  "createdBy" uuid NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "payroll_job_runs" ADD CONSTRAINT "payroll_job_runs_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "payroll_job_runs_tenantId_payrollRunId_kind_idempotencyKey_key" ON "payroll_job_runs"("tenantId", "payrollRunId", "kind", "idempotencyKey");
CREATE INDEX "payroll_job_runs_tenantId_payrollRunId_kind_status_idx" ON "payroll_job_runs"("tenantId", "payrollRunId", "kind", "status");

ALTER TABLE "payroll_job_runs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "payroll_job_runs";
CREATE POLICY tenant_isolation ON "payroll_job_runs" TO app_user USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "payroll_job_runs" TO app_user;

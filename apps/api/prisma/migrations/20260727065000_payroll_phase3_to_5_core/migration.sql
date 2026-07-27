ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'CALCULATING';
ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'CALCULATED';
ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'REVIEWED';
ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'FINALIZED';
ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'OUTPUTS_GENERATED';
ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'PAID';

CREATE TYPE "PayrollCalculationResultStatus" AS ENUM ('DRAFT', 'CALCULATED', 'OVERRIDDEN', 'FINAL');
CREATE TYPE "PayrollOutputKind" AS ENUM ('PAYSLIP', 'PAYROLL_REGISTER', 'BANK_EXPORT', 'ACCOUNTING_EXPORT');
CREATE TYPE "PayrollOutputStatus" AS ENUM ('GENERATED', 'PUBLISHED', 'REVOKED');
CREATE TYPE "PayrollPaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');
CREATE TYPE "PayrollCountryPackStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');

ALTER TABLE "payroll_runs" ADD COLUMN "calculationVersion" text;
ALTER TABLE "payroll_runs" ADD COLUMN "reviewedAt" timestamp(3);
ALTER TABLE "payroll_runs" ADD COLUMN "reviewedBy" uuid;
ALTER TABLE "payroll_runs" ADD COLUMN "approvedAt" timestamp(3);
ALTER TABLE "payroll_runs" ADD COLUMN "approvedBy" uuid;
ALTER TABLE "payroll_runs" ADD COLUMN "finalizedAt" timestamp(3);
ALTER TABLE "payroll_runs" ADD COLUMN "finalizedBy" uuid;
ALTER TABLE "payroll_runs" ADD COLUMN "outputsGeneratedAt" timestamp(3);
ALTER TABLE "payroll_runs" ADD COLUMN "publishedAt" timestamp(3);
ALTER TABLE "payroll_runs" ADD COLUMN "paidAt" timestamp(3);

CREATE TABLE "payroll_employee_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "employeeId" uuid NOT NULL,
  "grossPayMinor" bigint NOT NULL DEFAULT 0,
  "taxablePayMinor" bigint NOT NULL DEFAULT 0,
  "deductionMinor" bigint NOT NULL DEFAULT 0,
  "netPayMinor" bigint NOT NULL DEFAULT 0,
  "currency" text NOT NULL,
  "breakdown" jsonb NOT NULL DEFAULT '{}',
  "status" "PayrollCalculationResultStatus" NOT NULL DEFAULT 'CALCULATED',
  "overrideReason" text,
  "overriddenBy" uuid,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_component_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "employeeResultId" uuid NOT NULL,
  "employeeId" uuid NOT NULL,
  "payComponentId" uuid,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "componentType" "PayComponentType" NOT NULL,
  "amountMinor" bigint NOT NULL,
  "taxable" boolean NOT NULL DEFAULT false,
  "calculationTrace" jsonb NOT NULL DEFAULT '{}',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_payslips" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "employeeId" uuid NOT NULL,
  "payslipNumber" text NOT NULL,
  "status" "PayrollOutputStatus" NOT NULL DEFAULT 'GENERATED',
  "grossPayMinor" bigint NOT NULL,
  "netPayMinor" bigint NOT NULL,
  "currency" text NOT NULL,
  "payload" jsonb NOT NULL,
  "objectKey" text,
  "publishedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_output_exports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "kind" "PayrollOutputKind" NOT NULL,
  "status" "PayrollOutputStatus" NOT NULL DEFAULT 'GENERATED',
  "adapterKey" text NOT NULL,
  "checksum" text,
  "payload" jsonb NOT NULL,
  "createdBy" uuid NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_payment_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "payrollRunId" uuid NOT NULL,
  "status" "PayrollPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "reference" text,
  "paidAt" timestamp(3),
  "payload" jsonb NOT NULL DEFAULT '{}',
  "createdBy" uuid NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payroll_country_rule_packs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid,
  "countryCode" text NOT NULL,
  "version" text NOT NULL,
  "status" "PayrollCountryPackStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" date NOT NULL,
  "effectiveTo" date,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "createdBy" uuid,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "payroll_employee_results" ADD CONSTRAINT "payroll_employee_results_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_employee_results" ADD CONSTRAINT "payroll_employee_results_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_component_results" ADD CONSTRAINT "payroll_component_results_employeeResultId_fkey" FOREIGN KEY ("employeeResultId") REFERENCES "payroll_employee_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_payslips" ADD CONSTRAINT "payroll_payslips_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_output_exports" ADD CONSTRAINT "payroll_output_exports_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_payment_batches" ADD CONSTRAINT "payroll_payment_batches_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "payroll_employee_results_tenantId_payrollRunId_employeeId_key" ON "payroll_employee_results"("tenantId", "payrollRunId", "employeeId");
CREATE INDEX "payroll_employee_results_tenantId_payrollRunId_status_idx" ON "payroll_employee_results"("tenantId", "payrollRunId", "status");
CREATE INDEX "payroll_component_results_tenantId_employeeResultId_idx" ON "payroll_component_results"("tenantId", "employeeResultId");
CREATE INDEX "payroll_component_results_tenantId_employeeId_code_idx" ON "payroll_component_results"("tenantId", "employeeId", "code");
CREATE UNIQUE INDEX "payroll_payslips_tenantId_payrollRunId_employeeId_key" ON "payroll_payslips"("tenantId", "payrollRunId", "employeeId");
CREATE UNIQUE INDEX "payroll_payslips_tenantId_payslipNumber_key" ON "payroll_payslips"("tenantId", "payslipNumber");
CREATE INDEX "payroll_payslips_tenantId_employeeId_status_idx" ON "payroll_payslips"("tenantId", "employeeId", "status");
CREATE INDEX "payroll_output_exports_tenantId_payrollRunId_kind_idx" ON "payroll_output_exports"("tenantId", "payrollRunId", "kind");
CREATE INDEX "payroll_payment_batches_tenantId_payrollRunId_status_idx" ON "payroll_payment_batches"("tenantId", "payrollRunId", "status");
CREATE UNIQUE INDEX "payroll_country_rule_packs_tenantId_countryCode_version_key" ON "payroll_country_rule_packs"("tenantId", "countryCode", "version");
CREATE INDEX "payroll_country_rule_packs_countryCode_status_effectiveFrom_effectiveTo_idx" ON "payroll_country_rule_packs"("countryCode", "status", "effectiveFrom", "effectiveTo");

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_employee_results',
    'payroll_component_results',
    'payroll_payslips',
    'payroll_output_exports',
    'payroll_payment_batches',
    'payroll_country_rule_packs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO app_user USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid OR "tenantId" IS NULL) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid OR "tenantId" IS NULL)',
      table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO app_user', table_name);
  END LOOP;
END $$;

ALTER TABLE "payroll_runs" ADD COLUMN "grossPayMinor" bigint NOT NULL DEFAULT 0;
ALTER TABLE "payroll_runs" ADD COLUMN "taxablePayMinor" bigint NOT NULL DEFAULT 0;
ALTER TABLE "payroll_runs" ADD COLUMN "deductionMinor" bigint NOT NULL DEFAULT 0;
ALTER TABLE "payroll_runs" ADD COLUMN "employerCostMinor" bigint NOT NULL DEFAULT 0;
ALTER TABLE "payroll_runs" ADD COLUMN "netPayMinor" bigint NOT NULL DEFAULT 0;
ALTER TABLE "payroll_runs" ADD COLUMN "resultChecksum" text;
ALTER TABLE "payroll_employee_results" ADD COLUMN "variance" jsonb NOT NULL DEFAULT '{}';

-- CreateEnum
CREATE TYPE "PayrollModuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PayrollFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PayrollRecordStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PayrollVersionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "PayrollPolicyCategory" AS ENUM ('PRORATION', 'WORKING_DAY_BASIS', 'ROUNDING', 'OVERTIME_TREATMENT', 'LOSS_OF_PAY_TREATMENT', 'JOINER_TREATMENT', 'LEAVER_TREATMENT', 'APPROVAL_WORKFLOW', 'PAYMENT_CONFIGURATION', 'ACCOUNTING_CONFIGURATION');

-- CreateEnum
CREATE TYPE "PayrollPolicySourceLevel" AS ENUM ('COUNTRY_DEFAULT', 'ORGANIZATION', 'PAY_GROUP', 'SALARY_STRUCTURE', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "PayComponentType" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "PayComponentValueMode" AS ENUM ('FIXED', 'FORMULA_REFERENCE');

-- CreateEnum
CREATE TYPE "PayrollPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CHEQUE', 'WALLET');

-- CreateEnum
CREATE TYPE "EmployeePayrollStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'STOPPED');

-- CreateEnum
CREATE TYPE "PayrollProtectedDetailStatus" AS ENUM ('ACTIVE', 'REPLACED', 'REVOKED');

-- Make the Payroll product available for Phase 1 configuration.
UPDATE "modules"
SET "availability" = 'AVAILABLE',
    "description" = 'Payroll foundation, compensation configuration, policy setup, and protected employee payroll data'
WHERE "key" = 'PAYROLL';

-- CreateTable
CREATE TABLE "payroll_settings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "countryCode" TEXT NOT NULL,
    "defaultCurrency" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "payFrequency" "PayrollFrequency" NOT NULL,
    "defaultPayPeriodRule" JSONB NOT NULL,
    "defaultPayoutDateRule" JSONB NOT NULL,
    "workingDayBasis" TEXT NOT NULL,
    "defaultProrationPolicy" JSONB NOT NULL,
    "defaultRoundingPolicy" JSONB NOT NULL,
    "moduleStatus" "PayrollModuleStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_calendars" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "PayrollFrequency" NOT NULL,
    "periodStartRule" JSONB NOT NULL,
    "periodEndRule" JSONB NOT NULL,
    "payoutDateRule" JSONB NOT NULL,
    "timezone" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "status" "PayrollRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_groups" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "calendarId" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "prorationPolicyOverride" JSONB,
    "roundingPolicyOverride" JSONB,
    "overtimePolicyId" UUID,
    "lossOfPayPolicyId" UUID,
    "approvalPolicyId" UUID,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "status" "PayrollRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_group_employee_assignments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "payGroupId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "status" "PayrollRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedBy" UUID NOT NULL,
    "removedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_group_employee_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_policies" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PayrollPolicyCategory" NOT NULL,
    "status" "PayrollRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_policy_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PayrollVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceLevel" "PayrollPolicySourceLevel" NOT NULL DEFAULT 'ORGANIZATION',
    "sourceEntityId" UUID,
    "supportsOverrides" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "activatedAt" TIMESTAMP(3),
    "activatedBy" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_components" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PayComponentType" NOT NULL,
    "status" "PayrollRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_component_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "componentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PayrollVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "valueMode" "PayComponentValueMode" NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "statutory" BOOLEAN NOT NULL DEFAULT false,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "calculationOrder" INTEGER NOT NULL,
    "currencyBehavior" TEXT NOT NULL,
    "roundingBehavior" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "activatedAt" TIMESTAMP(3),
    "activatedBy" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_component_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structures" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "payGroupId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL,
    "status" "PayrollRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structure_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "structureId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PayrollVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "activatedAt" TIMESTAMP(3),
    "activatedBy" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structure_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structure_version_components" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "salaryStructureVersionId" UUID NOT NULL,
    "payComponentVersionId" UUID NOT NULL,
    "fixedAmountMinor" BIGINT,
    "percentageBasisPoints" INTEGER,
    "formulaReference" TEXT,
    "calculationOrder" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_structure_version_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_payroll_profiles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "payGroupId" UUID,
    "payrollStatus" "EmployeePayrollStatus" NOT NULL DEFAULT 'ACTIVE',
    "payrollCountry" TEXT NOT NULL,
    "paymentMethod" "PayrollPaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "salaryHold" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_payroll_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_compensation_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeePayrollProfileId" UUID NOT NULL,
    "salaryStructureVersionId" UUID NOT NULL,
    "baseAmountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "reason" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdBy" UUID NOT NULL,
    "endedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_compensation_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_payment_details" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeePayrollProfileId" UUID NOT NULL,
    "paymentMethod" "PayrollPaymentMethod" NOT NULL,
    "bankName" TEXT,
    "accountHolderName" TEXT,
    "accountNumberCiphertext" TEXT,
    "accountNumberLast4" TEXT,
    "routingCiphertext" TEXT,
    "routingLast4" TEXT,
    "status" "PayrollProtectedDetailStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_payment_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_statutory_details" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeePayrollProfileId" UUID NOT NULL,
    "countryCode" TEXT NOT NULL,
    "identifierType" TEXT NOT NULL,
    "identifierCiphertext" TEXT NOT NULL,
    "identifierLast4" TEXT,
    "status" "PayrollProtectedDetailStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_statutory_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_approval_policies" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PayrollRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_approval_policy_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "approvalPolicyId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PayrollVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "fourEyesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "makerCanApprove" BOOLEAN NOT NULL DEFAULT false,
    "requiredLevels" INTEGER NOT NULL DEFAULT 1,
    "allowedPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedRoleKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "activatedAt" TIMESTAMP(3),
    "activatedBy" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_approval_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_accounting_mappings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "payComponentId" UUID NOT NULL,
    "debitAccountCode" TEXT NOT NULL,
    "creditAccountCode" TEXT NOT NULL,
    "costCenterRule" JSONB NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PayrollRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_accounting_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_settings_tenantId_key" ON "payroll_settings"("tenantId");

-- CreateIndex
CREATE INDEX "payroll_settings_tenantId_moduleStatus_idx" ON "payroll_settings"("tenantId", "moduleStatus");

-- CreateIndex
CREATE INDEX "payroll_calendars_tenantId_status_idx" ON "payroll_calendars"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payroll_calendars_tenantId_effectiveFrom_effectiveTo_idx" ON "payroll_calendars"("tenantId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_calendars_tenantId_name_key" ON "payroll_calendars"("tenantId", "name");

-- CreateIndex
CREATE INDEX "pay_groups_tenantId_status_idx" ON "pay_groups"("tenantId", "status");

-- CreateIndex
CREATE INDEX "pay_groups_tenantId_calendarId_idx" ON "pay_groups"("tenantId", "calendarId");

-- CreateIndex
CREATE INDEX "pay_groups_tenantId_effectiveFrom_effectiveTo_idx" ON "pay_groups"("tenantId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "pay_groups_tenantId_code_key" ON "pay_groups"("tenantId", "code");

-- CreateIndex
CREATE INDEX "pay_group_employee_assignments_tenantId_employeeId_status_idx" ON "pay_group_employee_assignments"("tenantId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "pay_group_employee_assignments_tenantId_payGroupId_status_idx" ON "pay_group_employee_assignments"("tenantId", "payGroupId", "status");

-- CreateIndex
CREATE INDEX "pay_group_employee_assignments_tenantId_effectiveFrom_effec_idx" ON "pay_group_employee_assignments"("tenantId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "pay_group_employee_assignments_tenantId_employeeId_payGroup_key" ON "pay_group_employee_assignments"("tenantId", "employeeId", "payGroupId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "payroll_policies_tenantId_category_status_idx" ON "payroll_policies"("tenantId", "category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_policies_tenantId_code_key" ON "payroll_policies"("tenantId", "code");

-- CreateIndex
CREATE INDEX "payroll_policy_versions_tenantId_policyId_status_idx" ON "payroll_policy_versions"("tenantId", "policyId", "status");

-- CreateIndex
CREATE INDEX "payroll_policy_versions_tenantId_sourceLevel_sourceEntityId_idx" ON "payroll_policy_versions"("tenantId", "sourceLevel", "sourceEntityId");

-- CreateIndex
CREATE INDEX "payroll_policy_versions_tenantId_effectiveFrom_effectiveTo_idx" ON "payroll_policy_versions"("tenantId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_policy_versions_tenantId_policyId_version_key" ON "payroll_policy_versions"("tenantId", "policyId", "version");

-- CreateIndex
CREATE INDEX "pay_components_tenantId_type_status_idx" ON "pay_components"("tenantId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pay_components_tenantId_code_key" ON "pay_components"("tenantId", "code");

-- CreateIndex
CREATE INDEX "pay_component_versions_tenantId_componentId_status_idx" ON "pay_component_versions"("tenantId", "componentId", "status");

-- CreateIndex
CREATE INDEX "pay_component_versions_tenantId_effectiveFrom_effectiveTo_idx" ON "pay_component_versions"("tenantId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "pay_component_versions_tenantId_componentId_version_key" ON "pay_component_versions"("tenantId", "componentId", "version");

-- CreateIndex
CREATE INDEX "salary_structures_tenantId_payGroupId_status_idx" ON "salary_structures"("tenantId", "payGroupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "salary_structures_tenantId_code_key" ON "salary_structures"("tenantId", "code");

-- CreateIndex
CREATE INDEX "salary_structure_versions_tenantId_structureId_status_idx" ON "salary_structure_versions"("tenantId", "structureId", "status");

-- CreateIndex
CREATE INDEX "salary_structure_versions_tenantId_effectiveFrom_effectiveT_idx" ON "salary_structure_versions"("tenantId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "salary_structure_versions_tenantId_structureId_version_key" ON "salary_structure_versions"("tenantId", "structureId", "version");

-- CreateIndex
CREATE INDEX "salary_structure_version_components_tenantId_salaryStructur_idx" ON "salary_structure_version_components"("tenantId", "salaryStructureVersionId", "calculationOrder");

-- CreateIndex
CREATE UNIQUE INDEX "salary_structure_version_components_tenantId_salaryStructur_key" ON "salary_structure_version_components"("tenantId", "salaryStructureVersionId", "payComponentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_payroll_profiles_employeeId_key" ON "employee_payroll_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "employee_payroll_profiles_tenantId_payGroupId_idx" ON "employee_payroll_profiles"("tenantId", "payGroupId");

-- CreateIndex
CREATE INDEX "employee_payroll_profiles_tenantId_payrollStatus_idx" ON "employee_payroll_profiles"("tenantId", "payrollStatus");

-- CreateIndex
CREATE UNIQUE INDEX "employee_payroll_profiles_tenantId_employeeId_key" ON "employee_payroll_profiles"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "employee_compensation_versions_tenantId_employeePayrollProf_idx" ON "employee_compensation_versions"("tenantId", "employeePayrollProfileId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "employee_compensation_versions_tenantId_employeePayrollProf_key" ON "employee_compensation_versions"("tenantId", "employeePayrollProfileId", "version");

-- CreateIndex
CREATE INDEX "employee_payment_details_tenantId_employeePayrollProfileId__idx" ON "employee_payment_details"("tenantId", "employeePayrollProfileId", "status");

-- CreateIndex
CREATE INDEX "employee_statutory_details_tenantId_employeePayrollProfileI_idx" ON "employee_statutory_details"("tenantId", "employeePayrollProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_statutory_details_tenantId_employeePayrollProfileI_key" ON "employee_statutory_details"("tenantId", "employeePayrollProfileId", "countryCode", "identifierType", "version");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_approval_policies_tenantId_key" ON "payroll_approval_policies"("tenantId");

-- CreateIndex
CREATE INDEX "payroll_approval_policy_versions_tenantId_status_effectiveF_idx" ON "payroll_approval_policy_versions"("tenantId", "status", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_approval_policy_versions_tenantId_approvalPolicyId__key" ON "payroll_approval_policy_versions"("tenantId", "approvalPolicyId", "version");

-- CreateIndex
CREATE INDEX "payroll_accounting_mappings_tenantId_status_effectiveFrom_e_idx" ON "payroll_accounting_mappings"("tenantId", "status", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_accounting_mappings_tenantId_payComponentId_version_key" ON "payroll_accounting_mappings"("tenantId", "payComponentId", "version");

-- AddForeignKey
ALTER TABLE "pay_groups" ADD CONSTRAINT "pay_groups_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "payroll_calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_group_employee_assignments" ADD CONSTRAINT "pay_group_employee_assignments_payGroupId_fkey" FOREIGN KEY ("payGroupId") REFERENCES "pay_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_group_employee_assignments" ADD CONSTRAINT "pay_group_employee_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_policy_versions" ADD CONSTRAINT "payroll_policy_versions_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "payroll_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_component_versions" ADD CONSTRAINT "pay_component_versions_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "pay_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_payGroupId_fkey" FOREIGN KEY ("payGroupId") REFERENCES "pay_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structure_versions" ADD CONSTRAINT "salary_structure_versions_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structure_version_components" ADD CONSTRAINT "salary_structure_version_components_salaryStructureVersion_fkey" FOREIGN KEY ("salaryStructureVersionId") REFERENCES "salary_structure_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_structure_version_components" ADD CONSTRAINT "salary_structure_version_components_payComponentVersionId_fkey" FOREIGN KEY ("payComponentVersionId") REFERENCES "pay_component_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_payGroupId_fkey" FOREIGN KEY ("payGroupId") REFERENCES "pay_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_compensation_versions" ADD CONSTRAINT "employee_compensation_versions_employeePayrollProfileId_fkey" FOREIGN KEY ("employeePayrollProfileId") REFERENCES "employee_payroll_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_compensation_versions" ADD CONSTRAINT "employee_compensation_versions_salaryStructureVersionId_fkey" FOREIGN KEY ("salaryStructureVersionId") REFERENCES "salary_structure_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payment_details" ADD CONSTRAINT "employee_payment_details_employeePayrollProfileId_fkey" FOREIGN KEY ("employeePayrollProfileId") REFERENCES "employee_payroll_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_statutory_details" ADD CONSTRAINT "employee_statutory_details_employeePayrollProfileId_fkey" FOREIGN KEY ("employeePayrollProfileId") REFERENCES "employee_payroll_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_approval_policy_versions" ADD CONSTRAINT "payroll_approval_policy_versions_approvalPolicyId_fkey" FOREIGN KEY ("approvalPolicyId") REFERENCES "payroll_approval_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_accounting_mappings" ADD CONSTRAINT "payroll_accounting_mappings_payComponentId_fkey" FOREIGN KEY ("payComponentId") REFERENCES "pay_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

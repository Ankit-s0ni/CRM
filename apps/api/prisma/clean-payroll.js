const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = 'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { subdomain: 'acme' } });
  if (!tenant) { console.log('Acme tenant not found'); return; }
  const tid = tenant.id;
  console.log(`Cleaning payroll data for tenant ${tid}...`);

  // Delete in dependency order (children before parents)
  const deletes = [
    ['payroll_payment_batches', prisma.payrollPaymentBatch.deleteMany({ where: { tenantId: tid } })],
    ['payroll_output_exports', prisma.payrollOutputExport.deleteMany({ where: { tenantId: tid } })],
    ['payroll_payslips', prisma.payrollPayslip.deleteMany({ where: { tenantId: tid } })],
    ['payroll_employee_results', prisma.payrollEmployeeResult.deleteMany({ where: { tenantId: tid } })],
    ['payroll_component_results', prisma.payrollComponentResult.deleteMany({ where: { tenantId: tid } })],
    ['payroll_job_runs', prisma.payrollJobRun.deleteMany({ where: { tenantId: tid } })],
    ['payroll_run_timeline', prisma.payrollRunTimeline.deleteMany({ where: { tenantId: tid } })],
    ['payroll_validation_issues', prisma.payrollValidationIssue.deleteMany({ where: { tenantId: tid } })],
    ['payroll_validation_runs', prisma.payrollValidationRun.deleteMany({ where: { tenantId: tid } })],
    ['payroll_run_blockers', prisma.payrollRunBlocker.deleteMany({ where: { tenantId: tid } })],
    ['payroll_run_inputs', prisma.payrollRunInput.deleteMany({ where: { tenantId: tid } })],
    ['payroll_input_imports', prisma.payrollInputImport.deleteMany({ where: { tenantId: tid } })],
    ['payroll_run_employees', prisma.payrollRunEmployee.deleteMany({ where: { tenantId: tid } })],
    ['payroll_runs', prisma.payrollRun.deleteMany({ where: { tenantId: tid } })],
    ['employee_compensation_versions', prisma.employeeCompensationVersion.deleteMany({ where: { tenantId: tid } })],
    ['employee_payment_details', prisma.employeePaymentDetail.deleteMany({ where: { tenantId: tid } })],
    ['employee_statutory_details', prisma.employeeStatutoryDetail.deleteMany({ where: { tenantId: tid } })],
    ['employee_payroll_profiles', prisma.employeePayrollProfile.deleteMany({ where: { tenantId: tid } })],
    ['pay_group_employee_assignments', prisma.payGroupEmployeeAssignment.deleteMany({ where: { tenantId: tid } })],
    ['salary_structure_version_components', prisma.salaryStructureVersionComponent.deleteMany({ where: { tenantId: tid } })],
    ['salary_structure_versions', prisma.salaryStructureVersion.deleteMany({ where: { tenantId: tid } })],
    ['salary_structures', prisma.salaryStructure.deleteMany({ where: { tenantId: tid } })],
    ['pay_component_versions', prisma.payComponentVersion.deleteMany({ where: { tenantId: tid } })],
    ['payroll_accounting_mappings', prisma.payrollAccountingMapping.deleteMany({ where: { tenantId: tid } })],
    ['pay_components', prisma.payComponent.deleteMany({ where: { tenantId: tid } })],
    ['payroll_approval_policy_versions', prisma.payrollApprovalPolicyVersion.deleteMany({ where: { tenantId: tid } })],
    ['payroll_approval_policies', prisma.payrollApprovalPolicy.deleteMany({ where: { tenantId: tid } })],
    ['payroll_policy_versions', prisma.payrollPolicyVersion.deleteMany({ where: { tenantId: tid } })],
    ['payroll_policies', prisma.payrollPolicy.deleteMany({ where: { tenantId: tid } })],
    ['pay_groups', prisma.payGroup.deleteMany({ where: { tenantId: tid } })],
    ['payroll_calendars', prisma.payrollCalendar.deleteMany({ where: { tenantId: tid } })],
    ['payroll_settings', prisma.payrollSettings.deleteMany({ where: { tenantId: tid } })],
  ];

  for (const [name, promise] of deletes) {
    const result = await promise;
    console.log(`  ${name}: ${result.count} rows deleted`);
  }

  console.log('\nDone. All payroll data cleared.');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });

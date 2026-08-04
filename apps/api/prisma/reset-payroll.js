// Resets all payroll module data for demo tenants, keeping organization,
// employee and attendance data. Usage:
//   node prisma/reset-payroll.js                        (reset muscat + acme, revoke payroll.* perms)
//   node prisma/reset-payroll.js --grant-payroll-perms  (reset + re-grant payroll.* perms to admin roles)
//   node prisma/reset-payroll.js --tenant=muscat        (scope to one tenant)
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const GRANT = process.argv.includes('--grant-payroll-perms');
const TARGETS = process.argv
  .filter((arg) => arg.startsWith('--tenant='))
  .map((arg) => arg.split('=')[1]);
const SUBDOMAINS = TARGETS.length ? TARGETS : ['muscat', 'acme'];

const PAYROLL_PERMISSION_KEYS = [
  'payroll.settings.read',
  'payroll.settings.manage',
  'payroll.compensation.read',
  'payroll.compensation.manage',
  'payroll.protected-data.read',
  'payroll.protected-data.manage',
  'payroll.policies.read',
  'payroll.policies.manage',
  'payroll.components.read',
  'payroll.components.manage',
  'payroll.structures.read',
  'payroll.structures.manage',
  'payroll.accounting.read',
  'payroll.accounting.manage',
  'payroll.audit.read',
  'payroll.inputs.read',
  'payroll.inputs.manage',
  'payroll.runs.read',
  'payroll.runs.calculate',
  'payroll.runs.approve',
  'payroll.runs.finalize',
  'payroll.payments.read',
  'payroll.payments.manage',
  'payroll.payslips.self',
  'payroll.payslips.read',
  'payroll.payslips.publish',
  'payroll.reports.generate',
];

async function grantPayrollPermissions(prisma, tenantId) {
  await prisma.permission.createMany({
    data: PAYROLL_PERMISSION_KEYS.map((key) => ({ key })),
    skipDuplicates: true,
  });
  const permissions = await prisma.permission.findMany({
    where: { key: { in: PAYROLL_PERMISSION_KEYS } },
  });
  const roles = await prisma.role.findMany({
    where: { tenantId, name: { in: ['BUSINESS_ADMIN', 'HR_ADMIN', 'EMPLOYEE'] } },
  });
  let granted = 0;
  for (const role of roles) {
    const keys =
      role.name === 'EMPLOYEE'
        ? ['payroll.payslips.self', 'payroll.payslips.read']
        : PAYROLL_PERMISSION_KEYS;
    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const existingIds = new Set(existing.map((item) => item.permissionId));
    const missing = permissions
      .filter((permission) => keys.includes(permission.key))
      .filter((permission) => !existingIds.has(permission.id))
      .map((permission) => ({ roleId: role.id, permissionId: permission.id }));
    if (missing.length) {
      await prisma.rolePermission.createMany({ data: missing });
      granted += missing.length;
    }
  }
  return granted;
}

async function resetTenant(prisma, tenant) {
  const tenantId = tenant.id;
  const counts = {};
  const del = async (model, label) => {
    counts[label] = (await prisma[model].deleteMany({ where: { tenantId } })).count;
  };

  await del('payrollRun', 'payroll_runs');
  await del('payrollLockHistory', 'lock_history');
  counts.attendanceLogsUnlinked = (
    await prisma.attendanceLog.updateMany({
      where: { tenantId, payrollLockId: { not: null } },
      data: { payrollLockId: null, lockedBy: null, lockedAt: null },
    })
  ).count;
  await del('payrollLockPeriod', 'lock_periods');
  await del('reportExport', 'report_exports');
  await del('employeeCompensationVersion', 'compensation_versions');
  await del('employeePaymentDetail', 'payment_details');
  await del('employeeStatutoryDetail', 'statutory_details');
  await del('employeePayrollProfile', 'payroll_profiles');
  await del('payGroupEmployeeAssignment', 'paygroup_assignments');
  await del('payrollAccountingMapping', 'accounting_mappings');
  await del('payrollApprovalPolicyVersion', 'approval_policy_versions');
  await del('payrollApprovalPolicy', 'approval_policies');
  await del('salaryStructureVersionComponent', 'structure_components');
  await del('salaryStructureVersion', 'structure_versions');
  await del('salaryStructure', 'salary_structures');
  await del('payComponentVersion', 'component_versions');
  await del('payComponent', 'pay_components');
  await del('payrollPolicyVersion', 'policy_versions');
  await del('payrollPolicy', 'policies');
  await del('payGroup', 'pay_groups');
  await del('payrollCalendar', 'calendars');
  await del('payrollSettings', 'settings');

  const roles = await prisma.role.findMany({
    where: { tenantId },
    select: { id: true },
  });
  if (GRANT) {
    counts.permissionAssignmentsGranted = await grantPayrollPermissions(prisma, tenantId);
  } else {
    counts.permissionAssignmentsRemoved = (
      await prisma.rolePermission.deleteMany({
        where: {
          roleId: { in: roles.map((role) => role.id) },
          permission: { key: { startsWith: 'payroll.' } },
        },
      })
    ).count;
  }
  return counts;
}

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  for (const subdomain of SUBDOMAINS) {
    const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
    if (!tenant) {
      console.log(`SKIP ${subdomain}: tenant not found`);
      continue;
    }
    const counts = await resetTenant(prisma, tenant);
    console.log(`${GRANT ? 'GRANT' : 'RESET'} ${subdomain} (${tenant.companyName})`);
    for (const [key, value] of Object.entries(counts)) {
      if (value !== 0) console.log(`  ${key}: ${value}`);
    }
  }
  await prisma.$disconnect();
  await pool.end();
})().catch((error) => {
  console.error('ERR', error);
  process.exit(1);
});

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const permissions = [
  'organization.departments.read',
  'organization.departments.create',
  'organization.departments.update',
  'organization.departments.delete',
  'organization.designations.read',
  'organization.designations.create',
  'organization.designations.update',
  'organization.designations.delete',
  'organization.employees.read',
  'organization.employees.self.read',
  'organization.employees.create',
  'organization.employees.update',
  'organization.employees.lifecycle',
  'organization.imports.read',
  'organization.imports.create',
  'identity.users.read',
  'identity.users.invite',
  'identity.users.roles.update',
  'identity.users.status.update',
  'identity.roles.read',
  'identity.roles.create',
  'identity.roles.update',
  'identity.roles.delete',
  'workspace.settings.read',
  'workspace.settings.update',
  'workspace.modules.read',
  'billing.subscription.read',
  'billing.invoices.read',
  'billing.payment-methods.manage',
  'attendance.config.manage',
  'attendance.records.read',
  'attendance.records.self.read',
  'attendance.approvals.manage',
  'attendance.reports.read',
];

const rolePermissions = {
  BUSINESS_ADMIN: permissions,
  HR_ADMIN: permissions.filter(
    (permission) => !permission.startsWith('billing.'),
  ),
  MANAGER: [
    'organization.employees.read',
    'organization.employees.self.read',
    'attendance.records.read',
    'attendance.records.self.read',
    'attendance.approvals.manage',
  ],
  EMPLOYEE: [
    'organization.employees.self.read',
    'attendance.records.self.read',
  ],
};

const tenantSeeds = [
  {
    companyName: 'Acme Corp',
    subdomain: 'acme',
    email: 'admin@acme.com',
  },
  {
    companyName: 'Globex Corp',
    subdomain: 'globex',
    email: 'admin@globex.com',
  },
];

async function seedTenant(seed, planId, moduleId, permissionIdByKey) {
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: seed.subdomain },
    update: { companyName: seed.companyName },
    create: {
      companyName: seed.companyName,
      subdomain: seed.subdomain,
      status: 'ACTIVE',
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id },
  });

  await prisma.tenantBillingProfile.upsert({
    where: { tenantId: tenant.id },
    update: { billingEmail: seed.email },
    create: {
      tenantId: tenant.id,
      legalName: seed.companyName,
      billingEmail: seed.email,
    },
  });

  const currentSubscription = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId: tenant.id,
      status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] },
    },
  });
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date(currentPeriodStart);
  currentPeriodEnd.setUTCFullYear(currentPeriodEnd.getUTCFullYear() + 1);

  if (currentSubscription) {
    await prisma.tenantSubscription.update({
      where: { id: currentSubscription.id },
      data: { planId, seatCount: 150 },
    });
  } else {
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId,
        status: 'ACTIVE',
        seatCount: 150,
        currentPeriodStart,
        currentPeriodEnd,
      },
    });
  }

  const roleIdByName = new Map();
  for (const [name, assignedPermissions] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: { isSystem: true },
      create: { tenantId: tenant.id, name, isSystem: true },
    });
    roleIdByName.set(name, role.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: assignedPermissions.map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissionIdByKey.get(permissionKey),
      })),
    });
  }

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: seed.email } },
    update: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    create: {
      tenantId: tenant.id,
      email: seed.email,
      passwordHash: 'dummy_hash',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: roleIdByName.get('BUSINESS_ADMIN'),
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: roleIdByName.get('BUSINESS_ADMIN'),
    },
  });

  await prisma.tenantModule.upsert({
    where: { tenantId_moduleId: { tenantId: tenant.id, moduleId } },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      moduleId,
      isActive: true,
      activatedAt: new Date(),
      activatedBy: user.id,
    },
  });

  console.log(`Seeded ${tenant.companyName} (${tenant.subdomain})`);
}

async function main() {
  console.log('Seeding Sprint 1 foundation data...');

  const plan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Starter Trial' },
    update: { maxEmployees: 500 },
    create: {
      name: 'Starter Trial',
      pricePerUser: 0,
      maxEmployees: 500,
      billingPeriod: 'MONTHLY',
    },
  });
  const attendanceModule = await prisma.module.upsert({
    where: { key: 'ATTENDANCE' },
    update: { name: 'Attendance' },
    create: { key: 'ATTENDANCE', name: 'Attendance' },
  });

  await prisma.permission.createMany({
    data: permissions.map((key) => ({ key })),
    skipDuplicates: true,
  });
  const permissionRecords = await prisma.permission.findMany({
    where: { key: { in: permissions } },
  });
  const permissionIdByKey = new Map(
    permissionRecords.map((permission) => [permission.key, permission.id]),
  );

  for (const tenantSeed of tenantSeeds) {
    await seedTenant(
      tenantSeed,
      plan.id,
      attendanceModule.id,
      permissionIdByKey,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

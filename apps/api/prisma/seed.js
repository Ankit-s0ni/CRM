const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');

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

const platformPermissions = [
  'platform.dashboard.read',
  'platform.tenants.read',
  'platform.tenants.create',
  'platform.tenants.update',
  'platform.tenants.lifecycle',
  'platform.modules.read',
  'platform.modules.manage',
  'platform.impersonation.create',
  'platform.audit.read',
  'platform.alerts.read',
  'platform.alerts.manage',
  'platform.health.read',
];

const supportPlatformPermissions = [
  'platform.dashboard.read',
  'platform.tenants.read',
  'platform.modules.read',
  'platform.impersonation.create',
  'platform.audit.read',
  'platform.alerts.read',
  'platform.health.read',
];

async function seedPlatformIdentity() {
  await prisma.platformPermission.createMany({
    data: platformPermissions.map((key) => ({ key })),
    skipDuplicates: true,
  });
  const permissionRecords = await prisma.platformPermission.findMany({
    where: { key: { in: platformPermissions } },
  });
  const permissionIdByKey = new Map(
    permissionRecords.map((permission) => [permission.key, permission.id]),
  );
  const assignments = {
    SUPER_ADMIN: platformPermissions,
    SUPPORT: supportPlatformPermissions,
  };

  for (const [role, permissionKeys] of Object.entries(assignments)) {
    await prisma.platformRolePermission.deleteMany({ where: { role } });
    await prisma.platformRolePermission.createMany({
      data: permissionKeys.map((key) => ({
        role,
        permissionId: permissionIdByKey.get(key),
      })),
    });
  }

  const defaultsAllowed = process.env.NODE_ENV !== 'production';
  const users = [
    {
      email: process.env.PLATFORM_ADMIN_EMAIL ?? 'owner@deltcrm.local',
      password:
        process.env.PLATFORM_ADMIN_PASSWORD ??
        (defaultsAllowed ? 'PlatformAdmin123!' : ''),
      mfaSecret:
        process.env.PLATFORM_ADMIN_MFA_SECRET ??
        (defaultsAllowed ? 'JBSWY3DPEHPK3PXP' : ''),
      role: 'SUPER_ADMIN',
    },
    {
      email: process.env.PLATFORM_SUPPORT_EMAIL ?? 'support@deltcrm.local',
      password:
        process.env.PLATFORM_SUPPORT_PASSWORD ??
        (defaultsAllowed ? 'PlatformSupport123!' : ''),
      mfaSecret:
        process.env.PLATFORM_SUPPORT_MFA_SECRET ??
        (defaultsAllowed ? 'JBSWY3DPEHPK3PXP' : ''),
      role: 'SUPPORT',
    },
  ];

  for (const user of users) {
    if (!user.password || !user.mfaSecret) {
      throw new Error(
        `Platform seed credentials are required for ${user.email}`,
      );
    }
    const passwordHash = await argon2.hash(user.password);
    await prisma.platformUser.upsert({
      where: { email: user.email.toLowerCase() },
      update: {
        passwordHash,
        role: user.role,
        status: 'ACTIVE',
        mfaSecret: user.mfaSecret,
        mfaEnabled: true,
      },
      create: {
        email: user.email.toLowerCase(),
        passwordHash,
        role: user.role,
        status: 'ACTIVE',
        mfaSecret: user.mfaSecret,
        mfaEnabled: true,
      },
    });
  }

  console.log('Seeded platform Super Admin and Support identities');
}

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
    update: {
      name: 'Attendance',
      description: 'Time, presence, shifts and attendance operations',
      icon: 'clock-3',
      availability: 'AVAILABLE',
    },
    create: {
      key: 'ATTENDANCE',
      name: 'Attendance',
      description: 'Time, presence, shifts and attendance operations',
      icon: 'clock-3',
    },
  });
  await prisma.module.upsert({
    where: { key: 'FIELD_TRACKING' },
    update: {
      name: 'Field Tracking',
      description: 'Location-aware field workforce operations',
      icon: 'map-pin',
      availability: 'AVAILABLE',
      dependencyKeys: ['ATTENDANCE'],
    },
    create: {
      key: 'FIELD_TRACKING',
      name: 'Field Tracking',
      description: 'Location-aware field workforce operations',
      icon: 'map-pin',
      dependencyKeys: ['ATTENDANCE'],
    },
  });
  for (const module of [
    { key: 'LEAVE', name: 'Leave Management', icon: 'calendar-days' },
    { key: 'PAYROLL', name: 'Payroll', icon: 'wallet-cards' },
  ]) {
    await prisma.module.upsert({
      where: { key: module.key },
      update: { ...module, availability: 'COMING_SOON' },
      create: {
        ...module,
        description: `${module.name} module is planned for a later sprint`,
        availability: 'COMING_SOON',
      },
    });
  }

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

  await seedPlatformIdentity();
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

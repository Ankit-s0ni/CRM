/**
 * Platform-only seed — seeds ONLY Platform-owned tables.
 *
 * HRMS tables (Employee, Department, Shift, AttendancePolicy, LeavePolicy, etc.)
 * are NOT touched here. The HRMS service owns and seeds its own data.
 *
 * This seed is safe to run against a fresh Platform-only database that does not
 * have HRMS tables at all.
 *
 * Usage:
 *   node prisma/platform-seed.js
 *   DATABASE_URL=<platform-db-url> node prisma/platform-seed.js
 */

const { PrismaClient } = require('../src/generated/platform-client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');

const connectionString =
  process.env.PLATFORM_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://app_admin:admin_password@localhost:5451/platform_local?schema=public';

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── Platform Permissions ─────────────────────────────────────────────────────

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
  'platform.plans.read',
  'platform.plans.manage',
  'platform.billing.read',
  'platform.billing.manage',
  'platform.dunning.manage',
  'platform.localization.read',
  'platform.localization.translate',
  'platform.localization.review',
  'platform.localization.publish',
  'platform.localization.tenants.manage',
];

const supportPlatformPermissions = [
  'platform.dashboard.read',
  'platform.tenants.read',
  'platform.modules.read',
  'platform.impersonation.create',
  'platform.audit.read',
  'platform.alerts.read',
  'platform.health.read',
  'platform.plans.read',
  'platform.billing.read',
  'platform.localization.read',
];

// ─── Tenant-Workspace Permissions ─────────────────────────────────────────────
// These are Platform-managed permission keys that govern cross-product RBAC.
// NOTE: HRMS-specific permission key strings are here but the Permission rows
// themselves live in the Platform DB — they're the entitlement grants that
// Platform issues to workspace users and HRMS validates via JWT claims.

const tenantPermissions = [
  // Identity & workspace
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
  'workspace.localization.read',
  'workspace.localization.manage',
  'workspace.localization.overrides.manage',
  'workspace.dashboard.admin.read',
  'workspace.modules.read',
  'workspace.audit.read',
  'billing.subscription.read',
  'billing.subscription.manage',
  'billing.profile.manage',
  'billing.invoices.read',
  'billing.payment-methods.manage',
  // HRMS product permissions (Platform issues these; HRMS validates them from JWT)
  'organization.departments.read',
  'organization.departments.create',
  'organization.departments.update',
  'organization.departments.delete',
  'organization.designations.read',
  'organization.designations.create',
  'organization.designations.update',
  'organization.designations.delete',
  'organization.employees.read',
  'organization.employees.reports.read',
  'organization.employees.self.read',
  'organization.employees.create',
  'organization.employees.update',
  'organization.employees.lifecycle',
  'organization.employee-documents.read',
  'organization.employee-documents.manage',
  'organization.imports.read',
  'organization.imports.create',
  'mobile.runtime.read',
  'attendance.config.manage',
  'attendance.config.read',
  'attendance.offices.read',
  'attendance.offices.manage',
  'attendance.policies.read',
  'attendance.policies.manage',
  'attendance.shifts.read',
  'attendance.shifts.manage',
  'attendance.rosters.read',
  'attendance.rosters.manage',
  'attendance.holidays.read',
  'attendance.holidays.manage',
  'attendance.records.read',
  'attendance.records.self.read',
  'attendance.records.self.write',
  'attendance.exceptions.read',
  'attendance.exceptions.manage',
  'attendance.approvals.manage',
  'attendance.reports.read',
  'attendance.devices.read',
  'attendance.devices.manage',
  'attendance.biometrics.read',
  'attendance.biometrics.manage',
  'attendance.verification.read',
  'attendance.alert-rules.manage',
  'attendance.security-alerts.read',
  'attendance.security-alerts.manage',
  'attendance.field.live.read',
  'attendance.field.routes.read',
  'attendance.regularizations.self',
  'attendance.regularizations.manage',
  'attendance.reports.generate',
  'attendance.payroll-lock.manage',
  'notifications.self',
  'leave.self',
  'leave.approve',
  'leave.manage',
  'payroll.run.read',
  'payroll.run.manage',
  'payroll.run.approve',
  'payroll.run.finalize',
  'payroll.run.publish',
  'payroll.components.read',
  'payroll.components.manage',
  'payroll.employees.read',
  'payroll.employees.manage',
  'payroll.reports.read',
  'payroll.exports.read',
];

const rolePermissions = {
  BUSINESS_ADMIN: tenantPermissions,
  HR_ADMIN: tenantPermissions.filter(
    (p) =>
      !p.startsWith('billing.') &&
      p !== 'workspace.localization.manage' &&
      p !== 'workspace.localization.overrides.manage' &&
      p !== 'workspace.dashboard.admin.read',
  ),
  MANAGER: [
    'workspace.localization.read',
    'organization.employees.read',
    'organization.employees.self.read',
    'attendance.records.read',
    'attendance.records.self.read',
    'attendance.approvals.manage',
    'attendance.devices.read',
    'attendance.security-alerts.read',
    'attendance.field.live.read',
    'attendance.field.routes.read',
    'attendance.regularizations.self',
    'notifications.self',
    'leave.self',
    'leave.approve',
  ],
  EMPLOYEE: [
    'workspace.localization.read',
    'organization.employees.self.read',
    'attendance.records.self.read',
    'attendance.records.self.write',
    'mobile.runtime.read',
    'attendance.regularizations.self',
    'notifications.self',
    'leave.self',
  ],
};

// ─── Notification Templates ───────────────────────────────────────────────────
// These are Platform-owned because Platform dispatches notifications.
// HRMS emits events; Platform renders and delivers them.

const notificationEvents = [
  // Attendance events — triggered by HRMS, dispatched by Platform
  ['attendance.checked_in', 'Check-in recorded', '{{employeeName}} checked in successfully.'],
  ['attendance.marked_late', 'Late arrival recorded', '{{employeeName}} was marked late.'],
  ['attendance.missed_checkout', 'Checkout missing', '{{employeeName}} has a missing checkout.'],
  ['regularization.submitted', 'Correction request submitted', '{{employeeName}} submitted an attendance correction.'],
  ['regularization.approved', 'Correction approved', 'The attendance correction for {{employeeName}} was approved.'],
  ['regularization.rejected', 'Correction rejected', 'The attendance correction for {{employeeName}} was rejected.'],
  ['security.violation', 'Attendance security alert', 'A security verification issue was recorded for {{employeeName}}.'],
  ['offline.sync_completed', 'Offline attendance synced', 'Offline attendance for {{employeeName}} has been synchronized.'],
  // Platform events
  ['quota.warning', 'Employee quota warning', 'The workspace employee quota is nearly reached.'],
  ['billing.invoice_due', 'Invoice due', 'A DeltCRM workspace invoice is due.'],
  // Leave events — triggered by HRMS, dispatched by Platform
  ['leave.submitted', 'Leave request submitted', '{{employeeName}} submitted a leave request.'],
  ['leave.approved', 'Leave approved', 'The leave request for {{employeeName}} was approved.'],
  ['leave.rejected', 'Leave rejected', 'The leave request for {{employeeName}} was rejected.'],
  // Payroll events
  ['payroll.run.published', 'Payslip available', 'Your payslip for this period is now available.'],
  ['payroll.run.approved', 'Payroll approved', 'Payroll run has been approved and finalized.'],
];

// ─── Module catalog ───────────────────────────────────────────────────────────

const modules = [
  {
    key: 'HRMS',
    name: 'HRMS',
    description: 'Human Resource Management System — attendance and payroll',
    icon: 'users',
    availability: 'AVAILABLE',
    kind: 'PRODUCT',
    catalogOrder: 1,
    customerVisible: true,
  },
  {
    key: 'ATTENDANCE',
    name: 'Attendance',
    description: 'Time, presence, shifts and attendance operations',
    icon: 'clock-3',
    availability: 'AVAILABLE',
    kind: 'PRODUCT',
    catalogOrder: 10,
    customerVisible: true,
  },
  {
    key: 'PAYROLL',
    name: 'Payroll',
    description: 'Payroll calculation, approval, and statutory compliance',
    icon: 'banknote',
    availability: 'AVAILABLE',
    kind: 'PRODUCT',
    catalogOrder: 20,
    customerVisible: true,
  },
  {
    key: 'LEAVE',
    name: 'Leave Management',
    description: 'Leave policy, balances, and approvals',
    icon: 'calendar-off',
    availability: 'AVAILABLE',
    kind: 'PRODUCT',
    catalogOrder: 30,
    customerVisible: true,
  },
  {
    key: 'FIELD_TRACKING',
    name: 'Field Workforce Tracking',
    description: 'Location-aware field workforce operations',
    icon: 'map-pin',
    availability: 'AVAILABLE',
    kind: 'ADD_ON',
    catalogOrder: 40,
    customerVisible: true,
    dependencyKeys: ['ATTENDANCE'],
  },
  {
    key: 'REGULARIZATION',
    name: 'Attendance Regularization',
    description: 'Employee attendance correction workflow',
    icon: 'pencil',
    availability: 'AVAILABLE',
    kind: 'ADD_ON',
    catalogOrder: 50,
    customerVisible: true,
    dependencyKeys: ['ATTENDANCE'],
  },
];

const moduleCapabilities = [
  {
    moduleKey: 'ATTENDANCE',
    key: 'ATTENDANCE_CORE',
    name: 'Core attendance',
    description: 'Employee attendance, punches, history, and day details',
    isCore: true,
    configurable: false,
    displayOrder: 10,
  },
  {
    moduleKey: 'LEAVE',
    key: 'ATTENDANCE_LEAVE',
    name: 'Leave self service',
    description: 'Employee leave balances, requests, and cancellation',
    isCore: true,
    configurable: false,
    displayOrder: 20,
  },
  {
    moduleKey: 'ATTENDANCE',
    key: 'ATTENDANCE_SELFIE',
    name: 'Biometric attendance',
    description: 'Consent, face enrollment, and verified attendance evidence',
    configurable: true,
    displayOrder: 30,
  },
  {
    moduleKey: 'FIELD_TRACKING',
    key: 'ATTENDANCE_FIELD_TRACKING',
    name: 'Field tracking',
    description: 'Field sessions and mobile location ping ingestion',
    configurable: true,
    requiredModuleKeys: ['ATTENDANCE', 'FIELD_TRACKING'],
    dependencyKeys: ['ATTENDANCE_CORE'],
    displayOrder: 40,
  },
  {
    moduleKey: 'REGULARIZATION',
    key: 'ATTENDANCE_REGULARIZATION',
    name: 'Attendance regularization',
    description: 'Employee attendance correction requests',
    configurable: true,
    requiredModuleKeys: ['ATTENDANCE', 'REGULARIZATION'],
    dependencyKeys: ['ATTENDANCE_CORE'],
    displayOrder: 50,
  },
];

// ─── Subscription plans ───────────────────────────────────────────────────────

const subscriptionPlans = [
  {
    name: 'Starter Trial',
    pricePerUser: 0,
    currency: 'OMR',
    maxEmployees: 25,
    billingPeriod: 'MONTHLY',
    description: 'Free trial for up to 25 employees',
    moduleKeys: ['HRMS', 'ATTENDANCE', 'LEAVE'],
    capabilityKeys: ['ATTENDANCE_CORE', 'ATTENDANCE_LEAVE'],
  },
  {
    name: 'Growth',
    pricePerUser: 2.5,
    currency: 'OMR',
    maxEmployees: 200,
    billingPeriod: 'MONTHLY',
    description: 'Growth plan with Payroll and Field Tracking',
    moduleKeys: ['HRMS', 'ATTENDANCE', 'PAYROLL', 'LEAVE', 'FIELD_TRACKING', 'REGULARIZATION'],
    capabilityKeys: [
      'ATTENDANCE_CORE',
      'ATTENDANCE_LEAVE',
      'ATTENDANCE_SELFIE',
      'ATTENDANCE_FIELD_TRACKING',
      'ATTENDANCE_REGULARIZATION',
    ],
  },
  {
    name: 'Enterprise',
    pricePerUser: 4.0,
    currency: 'OMR',
    maxEmployees: 10000,
    billingPeriod: 'MONTHLY',
    description: 'Enterprise plan with full feature access',
    moduleKeys: ['HRMS', 'ATTENDANCE', 'PAYROLL', 'LEAVE', 'FIELD_TRACKING', 'REGULARIZATION'],
    capabilityKeys: [
      'ATTENDANCE_CORE',
      'ATTENDANCE_LEAVE',
      'ATTENDANCE_SELFIE',
      'ATTENDANCE_FIELD_TRACKING',
      'ATTENDANCE_REGULARIZATION',
    ],
  },
];

// ─── Dev/local tenant seeds ───────────────────────────────────────────────────

const tenantSeeds = [
  {
    tenantId: '01900000-0000-7000-8000-000000000001',
    adminUserId: '01900000-0000-7000-8000-000000000101',
    hrUserId: '01900000-0000-7000-8000-000000000102',
    employeeUserId: '01900000-0000-7000-8000-000000000103',
    companyName: 'Acme Logistics',
    subdomain: 'acme',
    email: 'admin@acme.com',
    hrEmail: 'hr@acme.com',
    employeeEmail: 'employee@acme.com',
  },
  {
    tenantId: '01900000-0000-7000-8000-000000000002',
    adminUserId: '01900000-0000-7000-8000-000000000201',
    hrUserId: '01900000-0000-7000-8000-000000000202',
    employeeUserId: '01900000-0000-7000-8000-000000000203',
    companyName: 'Globex Corp',
    subdomain: 'globex',
    email: 'admin@globex.com',
    hrEmail: 'hr@globex.com',
    employeeEmail: 'employee@globex.com',
  },
];

// ─── Seed functions ───────────────────────────────────────────────────────────

async function seedModules() {
  const moduleIdByKey = new Map();

  for (const mod of modules) {
    const { dependencyKeys, ...data } = mod;
    const seeded = await prisma.module.upsert({
      where: { key: data.key },
      update: {
        ...data,
        dependencyKeys: dependencyKeys ?? [],
        updatedAt: new Date(),
      },
      create: {
        ...data,
        dependencyKeys: dependencyKeys ?? [],
      },
    });
    moduleIdByKey.set(data.key, seeded.id);
  }

  // Set parentModuleId for add-ons
  const hrmsModule = await prisma.module.findUnique({ where: { key: 'HRMS' } });
  if (hrmsModule) {
    for (const key of ['ATTENDANCE', 'PAYROLL', 'LEAVE']) {
      const m = await prisma.module.findUnique({ where: { key } });
      if (m && !m.parentModuleId) {
        await prisma.module.update({
          where: { key },
          data: { parentModuleId: hrmsModule.id },
        });
      }
    }
  }

  const attendanceModule = await prisma.module.findUnique({ where: { key: 'ATTENDANCE' } });
  if (attendanceModule) {
    for (const key of ['FIELD_TRACKING', 'REGULARIZATION']) {
      await prisma.module.update({
        where: { key },
        data: { parentModuleId: attendanceModule.id },
      });
    }
  }

  console.log(`Seeded ${modules.length} modules`);
  return moduleIdByKey;
}

async function seedModuleCapabilities(moduleIdByKey) {
  const capabilityIdByKey = new Map();
  for (const capability of moduleCapabilities) {
    const moduleId = moduleIdByKey.get(capability.moduleKey);
    if (!moduleId) throw new Error(`Missing module ${capability.moduleKey}`);
    const { moduleKey: _moduleKey, ...data } = capability;
    const seeded = await prisma.moduleCapability.upsert({
      where: { key: data.key },
      update: { ...data, moduleId },
      create: { ...data, moduleId },
    });
    capabilityIdByKey.set(seeded.key, seeded.id);
  }
  console.log(`Seeded ${moduleCapabilities.length} module capabilities`);
  return capabilityIdByKey;
}

async function seedSubscriptionPlans(moduleIdByKey, capabilityIdByKey) {
  for (const plan of subscriptionPlans) {
    const { moduleKeys, capabilityKeys, ...data } = plan;
    const seededPlan = await prisma.subscriptionPlan.upsert({
      where: { name: data.name },
      update: { ...data, isActive: true },
      create: { ...data, isActive: true },
    });
    await prisma.subscriptionPlanModule.deleteMany({ where: { planId: seededPlan.id } });
    await prisma.subscriptionPlanModule.createMany({
      data: moduleKeys
        .filter((k) => moduleIdByKey.has(k))
        .map((k) => ({ planId: seededPlan.id, moduleId: moduleIdByKey.get(k) })),
    });
    await prisma.subscriptionPlanCapability.deleteMany({
      where: { planId: seededPlan.id },
    });
    await prisma.subscriptionPlanCapability.createMany({
      data: capabilityKeys.map((key) => ({
        planId: seededPlan.id,
        capabilityId: capabilityIdByKey.get(key),
        included: true,
      })),
    });
  }
  console.log(`Seeded ${subscriptionPlans.length} subscription plans`);
}

async function seedPermissions() {
  await prisma.permission.createMany({
    data: tenantPermissions.map((key) => ({ key })),
    skipDuplicates: true,
  });
  const records = await prisma.permission.findMany({
    where: { key: { in: tenantPermissions } },
  });
  const map = new Map(records.map((p) => [p.key, p.id]));
  console.log(`Seeded ${tenantPermissions.length} tenant permissions`);
  return map;
}

async function seedPlatformIdentity() {
  await prisma.platformPermission.createMany({
    data: platformPermissions.map((key) => ({ key })),
    skipDuplicates: true,
  });
  const records = await prisma.platformPermission.findMany({
    where: { key: { in: platformPermissions } },
  });
  const map = new Map(records.map((p) => [p.key, p.id]));

  const assignments = { SUPER_ADMIN: platformPermissions, SUPPORT: supportPlatformPermissions };
  for (const [role, keys] of Object.entries(assignments)) {
    await prisma.platformRolePermission.deleteMany({ where: { role } });
    await prisma.platformRolePermission.createMany({
      data: keys.map((k) => ({ role, permissionId: map.get(k) })),
    });
  }

  const defaultsAllowed = process.env.NODE_ENV !== 'production';
  const users = [
    {
      email: process.env.PLATFORM_ADMIN_EMAIL ?? 'owner@liqaahq.com',
      password: process.env.PLATFORM_ADMIN_PASSWORD ?? (defaultsAllowed ? 'PlatformAdmin123!' : ''),
      mfaSecret: process.env.PLATFORM_ADMIN_MFA_SECRET ?? (defaultsAllowed ? 'JBSWY3DPEHPK3PXP' : ''),
      role: 'SUPER_ADMIN',
    },
    {
      email: 'owner@liqaa.local',
      password: defaultsAllowed ? 'PlatformAdmin123!' : '',
      mfaSecret: defaultsAllowed ? 'JBSWY3DPEHPK3PXP' : '',
      role: 'SUPER_ADMIN',
    },
    {
      email: process.env.PLATFORM_SUPPORT_EMAIL ?? 'support@liqaahq.com',
      password: process.env.PLATFORM_SUPPORT_PASSWORD ?? (defaultsAllowed ? 'PlatformSupport123!' : ''),
      mfaSecret: process.env.PLATFORM_SUPPORT_MFA_SECRET ?? (defaultsAllowed ? 'JBSWY3DPEHPK3PXP' : ''),
      role: 'SUPPORT',
    },
  ];

  for (const u of users) {
    if (!u.password || !u.mfaSecret) throw new Error(`Platform seed credentials required for ${u.email}`);
    const passwordHash = await argon2.hash(u.password);
    await prisma.platformUser.upsert({
      where: { email: u.email.toLowerCase() },
      update: { passwordHash, role: u.role, status: 'ACTIVE', mfaSecret: u.mfaSecret, mfaEnabled: true },
      create: { email: u.email.toLowerCase(), passwordHash, role: u.role, status: 'ACTIVE', mfaSecret: u.mfaSecret, mfaEnabled: true },
    });
  }
  console.log('Seeded Platform Super Admin and Support identities');
}

async function seedNotificationTemplates() {
  for (const [eventKey, subject, bodyTemplate] of notificationEvents) {
    const requiredVariables = bodyTemplate.includes('{{employeeName}}') ? ['employeeName'] : [];
    for (const channel of ['IN_APP', 'PUSH', 'EMAIL']) {
      await prisma.notificationTemplate.upsert({
        where: { eventKey_channel_locale: { eventKey, channel, locale: 'en' } },
        update: { subject, bodyTemplate, requiredVariables, version: 1, isActive: true },
        create: { eventKey, channel, locale: 'en', subject, bodyTemplate, requiredVariables, version: 1 },
      });
    }
  }
  console.log(`Seeded ${notificationEvents.length * 3} notification templates`);
}

async function seedTenant(seed, moduleIdByKey, permissionIdByKey) {
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: seed.subdomain },
    update: { companyName: seed.companyName },
    create: { id: seed.tenantId, companyName: seed.companyName, subdomain: seed.subdomain, status: 'ACTIVE' },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id },
  });

  await prisma.tenantLocalePolicy.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, defaultLocale: 'en', enabledLocales: ['en', 'ar'] },
  });

  await prisma.tenantBillingProfile.upsert({
    where: { tenantId: tenant.id },
    update: { billingEmail: seed.email, currency: 'OMR' },
    create: {
      tenantId: tenant.id,
      legalName: seed.companyName,
      billingEmail: seed.email,
      currency: 'OMR',
      address: { line1: 'DeltCRM Local', city: 'Muscat', countryCode: 'OM' },
    },
  });

  // Subscription — attach to Growth plan
  const plan = await prisma.subscriptionPlan.findUnique({ where: { name: 'Growth' } });
  if (plan) {
    const existing = await prisma.tenantSubscription.findFirst({
      where: { tenantId: tenant.id, status: { in: ['TRIALING', 'ACTIVE'] } },
    });
    const start = new Date();
    const end = new Date(start);
    end.setUTCFullYear(end.getUTCFullYear() + 1);

    if (!existing) {
      await prisma.tenantSubscription.create({
        data: { tenantId: tenant.id, planId: plan.id, status: 'ACTIVE', seatCount: 150, currentPeriodStart: start, currentPeriodEnd: end },
      });
    } else {
      await prisma.tenantSubscription.update({
        where: { id: existing.id },
        data: {
          planId: plan.id,
          status: 'ACTIVE',
          seatCount: 150,
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
      });
    }
  }

  // Activate HRMS modules for this tenant
  for (const [key, moduleId] of moduleIdByKey) {
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId } },
      update: { isActive: true },
      create: { tenantId: tenant.id, moduleId, isActive: true, activatedAt: new Date() },
    });
  }

  // Roles
  const roleIdByName = new Map();
  for (const [name, permKeys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: { isSystem: true },
      create: { tenantId: tenant.id, name, isSystem: true },
    });
    roleIdByName.set(name, role.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permKeys
        .filter((k) => permissionIdByKey.has(k))
        .map((k) => ({ roleId: role.id, permissionId: permissionIdByKey.get(k) })),
    });
  }

  // Admin user
  const defaultsAllowed = process.env.NODE_ENV !== 'production';
  const adminPass = process.env.TENANT_ADMIN_PASSWORD ?? (defaultsAllowed ? 'TenantAdmin123!' : '');
  if (!adminPass) throw new Error('TENANT_ADMIN_PASSWORD required in production');
  const adminHash = await argon2.hash(adminPass);

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: seed.email } },
    update: { status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash: adminHash },
    create: { id: seed.adminUserId, tenantId: tenant.id, email: seed.email, passwordHash: adminHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: roleIdByName.get('BUSINESS_ADMIN') } },
    update: {},
    create: { userId: user.id, roleId: roleIdByName.get('BUSINESS_ADMIN') },
  });

  // HR user
  const hrPass = process.env.TENANT_HR_PASSWORD ?? (defaultsAllowed ? 'TenantHr123!' : '');
  if (!hrPass) throw new Error('TENANT_HR_PASSWORD required in production');
  const hrHash = await argon2.hash(hrPass);

  const hrUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: seed.hrEmail } },
    update: { status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash: hrHash },
    create: { id: seed.hrUserId, tenantId: tenant.id, email: seed.hrEmail, passwordHash: hrHash, status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: hrUser.id, roleId: roleIdByName.get('HR_ADMIN') } },
    update: {},
    create: { userId: hrUser.id, roleId: roleIdByName.get('HR_ADMIN') },
  });

  const employeePass = process.env.TENANT_EMPLOYEE_PASSWORD ??
    (defaultsAllowed ? 'Employee123!' : '');
  if (!employeePass) throw new Error('TENANT_EMPLOYEE_PASSWORD required in production');
  const employeeHash = await argon2.hash(employeePass);
  const employeeUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: seed.employeeEmail },
    },
    update: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      passwordHash: employeeHash,
    },
    create: {
      id: seed.employeeUserId,
      tenantId: tenant.id,
      email: seed.employeeEmail,
      passwordHash: employeeHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: employeeUser.id,
        roleId: roleIdByName.get('EMPLOYEE'),
      },
    },
    update: {},
    create: {
      userId: employeeUser.id,
      roleId: roleIdByName.get('EMPLOYEE'),
    },
  });

  await prisma.billingPaymentMethod.upsert({
    where: { gateway_providerMethodRef: { gateway: 'RAZORPAY', providerMethodRef: `seed_${seed.subdomain}_razorpay_method` } },
    update: { status: 'ACTIVE', isDefault: true },
    create: {
      tenantId: tenant.id,
      gateway: 'RAZORPAY',
      providerMethodRef: `seed_${seed.subdomain}_razorpay_method`,
      methodType: 'CARD',
      displayName: 'Seed Visa',
      lastFour: '4242',
      expiryMonth: 12,
      expiryYear: 2030,
      isDefault: true,
    },
  });

  console.log(`Seeded Platform data for tenant: ${tenant.companyName} (${tenant.subdomain})`);
  console.log(
    `  → Admin: ${seed.email} / HR: ${seed.hrEmail} / Employee: ${seed.employeeEmail}`,
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  DeltCRM Platform — Platform-Only Seed               ║');
  console.log('║  No HRMS tables will be touched.                     ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  const moduleIdByKey = await seedModules();
  const capabilityIdByKey = await seedModuleCapabilities(moduleIdByKey);
  await seedSubscriptionPlans(moduleIdByKey, capabilityIdByKey);
  const permissionIdByKey = await seedPermissions();
  await seedPlatformIdentity();
  await seedNotificationTemplates();

  if (process.env.NODE_ENV !== 'production') {
    console.log('\nSeeding local dev tenant fixtures...');
    for (const tenantSeed of tenantSeeds) {
      await seedTenant(tenantSeed, moduleIdByKey, permissionIdByKey);
    }
  }

  console.log('\n✅ Platform seed complete.');
  console.log('Next: run the separated HRMS seed (deltcrm-hrms/apps/api/prisma/hrms-seed.js).\n');
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

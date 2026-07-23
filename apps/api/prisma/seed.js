require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
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
  'organization.employees.reports.read',
  'organization.employees.self.read',
  'organization.employees.create',
  'organization.employees.update',
  'organization.employees.lifecycle',
  'organization.employee-documents.read',
  'organization.employee-documents.manage',
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
  'workspace.dashboard.admin.read',
  'workspace.modules.read',
  'workspace.audit.read',
  'mobile.runtime.read',
  'billing.subscription.read',
  'billing.subscription.manage',
  'billing.profile.manage',
  'billing.invoices.read',
  'billing.payment-methods.manage',
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
  'notifications.self',
  'attendance.reports.generate',
  'attendance.payroll-lock.manage',
  'leave.self',
  'leave.approve',
  'leave.manage',
];

const rolePermissions = {
  BUSINESS_ADMIN: permissions,
  HR_ADMIN: permissions.filter(
    (permission) =>
      !permission.startsWith('billing.') &&
      permission !== 'workspace.dashboard.admin.read',
  ),
  MANAGER: [
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
    'organization.employees.self.read',
    'attendance.records.self.read',
    'mobile.runtime.read',
    'attendance.regularizations.self',
    'notifications.self',
    'leave.self',
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
  'platform.plans.read',
  'platform.plans.manage',
  'platform.billing.read',
  'platform.billing.manage',
  'platform.dunning.manage',
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
];

const notificationEvents = [
  [
    'attendance.checked_in',
    'Check-in recorded',
    '{{employeeName}} checked in successfully.',
  ],
  [
    'attendance.marked_late',
    'Late arrival recorded',
    '{{employeeName}} was marked late.',
  ],
  [
    'attendance.missed_checkout',
    'Checkout missing',
    '{{employeeName}} has a missing checkout.',
  ],
  [
    'regularization.submitted',
    'Correction request submitted',
    '{{employeeName}} submitted an attendance correction.',
  ],
  [
    'regularization.approved',
    'Correction approved',
    'The attendance correction for {{employeeName}} was approved.',
  ],
  [
    'regularization.rejected',
    'Correction rejected',
    'The attendance correction for {{employeeName}} was rejected.',
  ],
  [
    'security.violation',
    'Attendance security alert',
    'A security verification issue was recorded for {{employeeName}}.',
  ],
  [
    'offline.sync_completed',
    'Offline attendance synced',
    'Offline attendance for {{employeeName}} has been synchronized.',
  ],
  [
    'quota.warning',
    'Employee quota warning',
    'The workspace employee quota is nearly reached.',
  ],
  ['billing.invoice_due', 'Invoice due', 'A DeltCRM workspace invoice is due.'],
  [
    'leave.submitted',
    'Leave request submitted',
    '{{employeeName}} submitted a leave request.',
  ],
  [
    'leave.approved',
    'Leave approved',
    'The leave request for {{employeeName}} was approved.',
  ],
  [
    'leave.rejected',
    'Leave rejected',
    'The leave request for {{employeeName}} was rejected.',
  ],
];

async function seedNotificationTemplates() {
  for (const [eventKey, subject, bodyTemplate] of notificationEvents) {
    const requiredVariables = bodyTemplate.includes('{{employeeName}}')
      ? ['employeeName']
      : [];
    for (const channel of ['IN_APP', 'PUSH', 'EMAIL']) {
      await prisma.notificationTemplate.upsert({
        where: {
          eventKey_channel_locale: { eventKey, channel, locale: 'en' },
        },
        update: {
          subject,
          bodyTemplate,
          requiredVariables,
          version: 1,
          isActive: true,
        },
        create: {
          eventKey,
          channel,
          locale: 'en',
          subject,
          bodyTemplate,
          requiredVariables,
          version: 1,
        },
      });
    }
  }
}

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
    companyName: 'Acme Logistics',
    subdomain: 'acme',
    email: 'admin@acme.com',
    hrEmail: 'hr@acme.com',
  },
  {
    companyName: 'Globex Corp',
    subdomain: 'globex',
    email: 'admin@globex.com',
    hrEmail: 'hr@globex.com',
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

  const defaultShift = await prisma.shift.upsert({
    where: {
      tenantId_name: { tenantId: tenant.id, name: 'Morning 09:00-18:00' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Morning 09:00-18:00',
      startTime: new Date('1970-01-01T09:00:00.000Z'),
      endTime: new Date('1970-01-01T18:00:00.000Z'),
      isOvernight: false,
    },
  });

  const defaultPolicy = await prisma.attendancePolicy.upsert({
    where: {
      tenantId_name: { tenantId: tenant.id, name: 'Default Office' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Default Office',
    },
  });
  const defaultAssignment = await prisma.policyAssignment.findFirst({
    where: { tenantId: tenant.id, scope: 'TENANT_DEFAULT' },
  });
  if (defaultAssignment) {
    await prisma.policyAssignment.update({
      where: { id: defaultAssignment.id },
      data: { policyId: defaultPolicy.id },
    });
  } else {
    await prisma.policyAssignment.create({
      data: {
        tenantId: tenant.id,
        policyId: defaultPolicy.id,
        scope: 'TENANT_DEFAULT',
      },
    });
  }

  await prisma.tenantBillingProfile.upsert({
    where: { tenantId: tenant.id },
    update: {
      billingEmail: seed.email,
      gstin: '27ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      currency: 'OMR',
      address: {
        line1: 'DeltCRM Acceptance Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        countryCode: 'IN',
      },
    },
    create: {
      tenantId: tenant.id,
      legalName: seed.companyName,
      billingEmail: seed.email,
      gstin: '27ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      currency: 'OMR',
      address: {
        line1: 'DeltCRM Acceptance Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        countryCode: 'IN',
      },
    },
  });

  const currentSubscription = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId: tenant.id,
      status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
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

  const tenantAdminPassword =
    process.env.TENANT_ADMIN_PASSWORD ??
    (process.env.NODE_ENV !== 'production' ? 'TenantAdmin123!' : '');
  if (!tenantAdminPassword) {
    throw new Error('TENANT_ADMIN_PASSWORD is required in production');
  }
  const tenantAdminPasswordHash = await argon2.hash(tenantAdminPassword);
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: seed.email } },
    update: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      passwordHash: tenantAdminPasswordHash,
    },
    create: {
      tenantId: tenant.id,
      email: seed.email,
      passwordHash: tenantAdminPasswordHash,
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

  const tenantHrPassword =
    process.env.TENANT_HR_PASSWORD ??
    (process.env.NODE_ENV !== 'production' ? 'TenantHr123!' : '');
  if (!tenantHrPassword) {
    throw new Error('TENANT_HR_PASSWORD is required in production');
  }
  const tenantHrPasswordHash = await argon2.hash(tenantHrPassword);
  const hrUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: seed.hrEmail },
    },
    update: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      passwordHash: tenantHrPasswordHash,
    },
    create: {
      tenantId: tenant.id,
      email: seed.hrEmail,
      passwordHash: tenantHrPasswordHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: hrUser.id,
        roleId: roleIdByName.get('HR_ADMIN'),
      },
    },
    update: {},
    create: {
      userId: hrUser.id,
      roleId: roleIdByName.get('HR_ADMIN'),
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
  const operationalModules = await prisma.module.findMany({
    where: { key: { in: ['REGULARIZATION', 'PAYROLL'] } },
  });
  for (const operationalModule of operationalModules) {
    await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleId: {
          tenantId: tenant.id,
          moduleId: operationalModule.id,
        },
      },
      update: { isActive: true },
      create: {
        tenantId: tenant.id,
        moduleId: operationalModule.id,
        isActive: true,
        activatedAt: new Date(),
        activatedBy: user.id,
      },
    });
  }

  if (seed.subdomain === 'acme') {
    await seedSprint3AcceptanceFixture(
      tenant.id,
      defaultShift.id,
      roleIdByName.get('EMPLOYEE'),
      user.id,
    );
  }

  console.log(`Seeded ${tenant.companyName} (${tenant.subdomain})`);
}

async function seedSprint3AcceptanceFixture(
  tenantId,
  defaultShiftId,
  employeeRoleId,
  adminUserId,
) {
  await prisma.tenantSettings.update({
    where: { tenantId },
    data: {
      timezone: 'Asia/Kolkata',
      weeklyOffs: [{ weekday: 'SAT', occurrences: [2, 4] }, 'SUN'],
      workingDayStart: '09:00',
      workingDayEnd: '18:00',
    },
  });

  const departments = [];
  for (const name of ['Operations', 'Sales', 'People']) {
    let department = await prisma.department.findFirst({
      where: { tenantId, parentDeptId: null, name },
    });
    department ??= await prisma.department.create({
      data: { tenantId, name },
    });
    departments.push(department);
  }

  const designation = await prisma.designation.upsert({
    where: { tenantId_name: { tenantId, name: 'Team Member' } },
    update: {},
    create: { tenantId, name: 'Team Member' },
  });

  const shifts = [];
  for (const shift of [
    { name: 'Morning 09:00-18:00', start: '09:00', end: '18:00' },
    { name: 'Late 10:00-19:00', start: '10:00', end: '19:00' },
    { name: 'Night 22:00-06:00', start: '22:00', end: '06:00' },
  ]) {
    shifts.push(
      await prisma.shift.upsert({
        where: { tenantId_name: { tenantId, name: shift.name } },
        update: {},
        create: {
          tenantId,
          name: shift.name,
          startTime: new Date(`1970-01-01T${shift.start}:00.000Z`),
          endTime: new Date(`1970-01-01T${shift.end}:00.000Z`),
          isOvernight: shift.end < shift.start,
        },
      }),
    );
  }

  const employees = [];
  for (let index = 1; index <= 25; index += 1) {
    employees.push(
      await prisma.employee.upsert({
        where: {
          tenantId_employeeCode: {
            tenantId,
            employeeCode: `ACME-${String(index).padStart(3, '0')}`,
          },
        },
        update: {
          workType: index <= 5 ? 'FIELD' : index <= 10 ? 'HYBRID' : 'OFFICE',
          deptId: departments[(index - 1) % departments.length].id,
          designationId: designation.id,
          defaultShiftId: index % 7 === 0 ? shifts[1].id : defaultShiftId,
        },
        create: {
          tenantId,
          employeeCode: `ACME-${String(index).padStart(3, '0')}`,
          fullName: `Acme Employee ${String(index).padStart(2, '0')}`,
          workType: index <= 5 ? 'FIELD' : index <= 10 ? 'HYBRID' : 'OFFICE',
          dateOfJoining: new Date('2026-01-01T00:00:00.000Z'),
          deptId: departments[(index - 1) % departments.length].id,
          designationId: designation.id,
          defaultShiftId: index % 7 === 0 ? shifts[1].id : defaultShiftId,
        },
      }),
    );
  }

  const mobileEmployeeEmail = 'employee@acme.com';
  const mobileEmployeePassword =
    process.env.MOBILE_EMPLOYEE_PASSWORD ??
    (process.env.NODE_ENV !== 'production' ? 'Employee123!' : '');
  if (!mobileEmployeePassword) {
    throw new Error('MOBILE_EMPLOYEE_PASSWORD is required in production');
  }
  const mobileEmployeePasswordHash = await argon2.hash(mobileEmployeePassword);
  const mobileEmployee = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId, email: mobileEmployeeEmail },
    },
    update: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      passwordHash: mobileEmployeePasswordHash,
    },
    create: {
      tenantId,
      email: mobileEmployeeEmail,
      passwordHash: mobileEmployeePasswordHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: mobileEmployee.id,
        roleId: employeeRoleId,
      },
    },
    update: {},
    create: { userId: mobileEmployee.id, roleId: employeeRoleId },
  });
  await prisma.employee.update({
    where: { id: employees[0].id },
    data: { userId: mobileEmployee.id },
  });
  await prisma.employee.update({
    where: { id: employees[24].id },
    data: { userId: adminUserId },
  });
  await prisma.employee.updateMany({
    where: { id: { in: employees.slice(0, 12).map(({ id }) => id) } },
    data: { managerId: employees[24].id },
  });

  const offices = [];
  for (const office of [
    {
      officeName: 'Bengaluru HQ',
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 100,
      egressIps: ['203.0.113.10', '10.10.0.0/24'],
      wifiSsids: ['Acme-BLR'],
    },
    {
      officeName: 'Mumbai Hub',
      latitude: 19.076,
      longitude: 72.8777,
      radiusMeters: 150,
      egressIps: ['203.0.113.20', '10.20.0.0/24'],
      wifiSsids: ['Acme-BOM'],
    },
  ]) {
    offices.push(
      await prisma.officeLocation.upsert({
        where: {
          tenantId_officeName: { tenantId, officeName: office.officeName },
        },
        update: office,
        create: { tenantId, timezone: 'Asia/Kolkata', ...office },
      }),
    );
  }

  for (const [index, employee] of employees.entries()) {
    const primaryOffice = offices[index % offices.length];
    await prisma.employeeOfficeAssignment.upsert({
      where: {
        tenantId_employeeId_officeLocationId: {
          tenantId,
          employeeId: employee.id,
          officeLocationId: primaryOffice.id,
        },
      },
      update: { isPrimary: true },
      create: {
        tenantId,
        employeeId: employee.id,
        officeLocationId: primaryOffice.id,
        isPrimary: true,
      },
    });
    if (index < 5) {
      const secondaryOffice = offices[(index + 1) % offices.length];
      await prisma.employeeOfficeAssignment.upsert({
        where: {
          tenantId_employeeId_officeLocationId: {
            tenantId,
            employeeId: employee.id,
            officeLocationId: secondaryOffice.id,
          },
        },
        update: { isPrimary: false },
        create: {
          tenantId,
          employeeId: employee.id,
          officeLocationId: secondaryOffice.id,
          isPrimary: false,
        },
      });
    }
  }

  const fieldPolicy = await prisma.attendancePolicy.upsert({
    where: { tenantId_name: { tenantId, name: 'Field Staff' } },
    update: {},
    create: {
      tenantId,
      name: 'Field Staff',
      requireGeofence: false,
      maxOfflineSyncHours: 72,
    },
  });
  const nightPolicy = await prisma.attendancePolicy.upsert({
    where: { tenantId_name: { tenantId, name: 'Night Shift' } },
    update: {},
    create: {
      tenantId,
      name: 'Night Shift',
      lateAfterMinutes: 10,
      requireFaceMatch: true,
    },
  });
  await upsertPolicyScope(tenantId, fieldPolicy.id, {
    scope: 'DEPARTMENT',
    deptId: departments[1].id,
  });
  await upsertPolicyScope(tenantId, nightPolicy.id, {
    scope: 'EMPLOYEE',
    employeeId: employees[0].id,
  });

  const annualLeave = await prisma.leavePolicy.upsert({
    where: { tenantId_name: { tenantId, name: 'Annual Leave' } },
    update: {
      leaveType: 'ANNUAL',
      accrualLogic: { annualEntitlement: 24, carryForwardLimit: 5 },
      isActive: true,
    },
    create: {
      tenantId,
      name: 'Annual Leave',
      leaveType: 'ANNUAL',
      accrualLogic: { annualEntitlement: 24, carryForwardLimit: 5 },
    },
  });
  for (const employee of employees) {
    const balance = await prisma.leaveBalance.upsert({
      where: {
        tenantId_employeeId_policyId: {
          tenantId,
          employeeId: employee.id,
          policyId: annualLeave.id,
        },
      },
      update: {},
      create: {
        tenantId,
        employeeId: employee.id,
        policyId: annualLeave.id,
        remainingDays: 24,
      },
    });
    await prisma.leaveBalanceLedger.upsert({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey: `policy:${annualLeave.id}:employee:${employee.id}:initial`,
        },
      },
      update: {},
      create: {
        tenantId,
        balanceId: balance.id,
        entryType: 'CREDIT',
        days: 24,
        balanceAfter: balance.remainingDays,
        reason: 'Initial policy entitlement',
        actorUserId: adminUserId,
        idempotencyKey: `policy:${annualLeave.id}:employee:${employee.id}:initial`,
      },
    });
  }

  await prisma.shift.deleteMany({
    where: {
      tenantId,
      name: 'General 09:00-18:00',
      defaultFor: { none: {} },
      rosters: { none: {} },
      appliedLogs: { none: {} },
    },
  });
}

async function upsertPolicyScope(tenantId, policyId, assignment) {
  const existing = await prisma.policyAssignment.findFirst({
    where: { tenantId, ...assignment },
  });
  if (existing) {
    await prisma.policyAssignment.update({
      where: { id: existing.id },
      data: { policyId },
    });
  } else {
    await prisma.policyAssignment.create({
      data: { tenantId, policyId, ...assignment },
    });
  }
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
      kind: 'PRODUCT',
      catalogOrder: 10,
      customerVisible: true,
    },
    create: {
      key: 'ATTENDANCE',
      name: 'Attendance',
      description: 'Time, presence, shifts and attendance operations',
      icon: 'clock-3',
      kind: 'PRODUCT',
      catalogOrder: 10,
    },
  });
  await prisma.module.upsert({
    where: { key: 'FIELD_TRACKING' },
    update: {
      name: 'Field Workforce Tracking',
      description: 'Location-aware field workforce operations',
      icon: 'map-pin',
      availability: 'AVAILABLE',
      dependencyKeys: ['ATTENDANCE'],
      kind: 'ADD_ON',
      parentModuleId: attendanceModule.id,
      catalogOrder: 20,
      customerVisible: true,
    },
    create: {
      key: 'FIELD_TRACKING',
      name: 'Field Workforce Tracking',
      description: 'Location-aware field workforce operations',
      icon: 'map-pin',
      dependencyKeys: ['ATTENDANCE'],
      kind: 'ADD_ON',
      parentModuleId: attendanceModule.id,
      catalogOrder: 20,
    },
  });
  for (const module of [
    {
      key: 'REGULARIZATION',
      name: 'Attendance Regularization',
      icon: 'file-pen-line',
      availability: 'DEPRECATED',
      customerVisible: false,
      catalogOrder: 90,
    },
    {
      key: 'LEAVE',
      name: 'Leave Management',
      icon: 'calendar-days',
      availability: 'DEPRECATED',
      customerVisible: false,
      catalogOrder: 100,
    },
    {
      key: 'PAYROLL',
      name: 'Payroll',
      icon: 'wallet-cards',
      dependencyKeys: ['ATTENDANCE'],
      availability: 'COMING_SOON',
      catalogOrder: 110,
    },
  ]) {
    await prisma.module.upsert({
      where: { key: module.key },
      update: module,
      create: {
        ...module,
        description: `${module.name} operations for DeltCRM workspaces`,
        availability: module.availability ?? 'AVAILABLE',
      },
    });
  }

  const modules = await prisma.module.findMany({
    where: {
      key: {
        in: [
          'ATTENDANCE',
          'FIELD_TRACKING',
          'REGULARIZATION',
          'LEAVE',
          'PAYROLL',
        ],
      },
    },
  });
  const moduleIdByKey = new Map(
    modules.map((module) => [module.key, module.id]),
  );
  const capabilityDefinitions = [
    [
      'ATTENDANCE_CORE',
      'Attendance check-in and check-out',
      true,
      true,
      [],
      10,
    ],
    [
      'ATTENDANCE_REPORTS_BASIC',
      'Attendance registers and basic reports',
      true,
      false,
      ['ATTENDANCE_CORE'],
      20,
    ],
    [
      'ATTENDANCE_OFFICE_GEOFENCE',
      'Office location verification',
      false,
      true,
      ['ATTENDANCE_CORE'],
      30,
    ],
    [
      'ATTENDANCE_DEVICE_TRUST',
      'Registered device verification',
      false,
      true,
      ['ATTENDANCE_CORE'],
      40,
    ],
    [
      'ATTENDANCE_SELFIE',
      'Selfie verification',
      false,
      true,
      ['ATTENDANCE_CORE'],
      50,
    ],
    [
      'ATTENDANCE_SHIFTS_ROSTERS',
      'Shifts and rosters',
      false,
      true,
      ['ATTENDANCE_CORE'],
      60,
    ],
    [
      'ATTENDANCE_REGULARIZATION',
      'Attendance correction requests',
      false,
      true,
      ['ATTENDANCE_CORE'],
      70,
    ],
    [
      'ATTENDANCE_LEAVE',
      'Leave requests and approvals',
      true,
      true,
      ['ATTENDANCE_CORE'],
      75,
    ],
    [
      'ATTENDANCE_REPORTS_ADVANCED',
      'Advanced attendance reports',
      false,
      false,
      ['ATTENDANCE_REPORTS_BASIC'],
      80,
    ],
    [
      'ATTENDANCE_PAYROLL_EXPORT',
      'Payroll-ready export and period lock',
      false,
      true,
      ['ATTENDANCE_REPORTS_BASIC'],
      90,
    ],
    [
      'ATTENDANCE_FIELD_TRACKING',
      'Field Workforce Tracking',
      false,
      true,
      ['ATTENDANCE_CORE'],
      100,
    ],
  ];
  for (const [
    key,
    name,
    isCore,
    configurable,
    dependencyKeys,
    displayOrder,
  ] of capabilityDefinitions) {
    const requiredModuleKeys =
      key === 'ATTENDANCE_FIELD_TRACKING'
        ? ['ATTENDANCE', 'FIELD_TRACKING']
        : ['ATTENDANCE'];
    await prisma.moduleCapability.upsert({
      where: { key },
      update: {
        name,
        isCore,
        configurable,
        requiredModuleKeys,
        dependencyKeys,
        displayOrder,
        availability: 'AVAILABLE',
      },
      create: {
        moduleId: attendanceModule.id,
        key,
        name,
        isCore,
        configurable,
        requiredModuleKeys,
        dependencyKeys,
        displayOrder,
      },
    });
  }
  const capabilities = await prisma.moduleCapability.findMany({
    where: { moduleId: attendanceModule.id },
  });
  const capabilityIdByKey = new Map(
    capabilities.map((capability) => [capability.key, capability.id]),
  );
  const coreCapabilityKeys = [
    'ATTENDANCE_CORE',
    'ATTENDANCE_REPORTS_BASIC',
    'ATTENDANCE_OFFICE_GEOFENCE',
    'ATTENDANCE_DEVICE_TRUST',
    'ATTENDANCE_SHIFTS_ROSTERS',
    'ATTENDANCE_REGULARIZATION',
    'ATTENDANCE_LEAVE',
  ];
  const seededPlans = [
    {
      name: 'Growth Monthly',
      description: 'Attendance controls and reports for growing teams',
      pricePerUser: '299.00',
      maxEmployees: 500,
      billingPeriod: 'MONTHLY',
      moduleKeys: ['ATTENDANCE'],
      capabilityKeys: [
        ...coreCapabilityKeys,
        'ATTENDANCE_SELFIE',
        'ATTENDANCE_REPORTS_ADVANCED',
        'ATTENDANCE_PAYROLL_EXPORT',
      ],
    },
    {
      name: 'Enterprise Monthly',
      description: 'Complete workforce operations and field tracking bundle',
      pricePerUser: '499.00',
      maxEmployees: 5000,
      billingPeriod: 'MONTHLY',
      moduleKeys: ['ATTENDANCE', 'FIELD_TRACKING'],
      capabilityKeys: capabilities.map(({ key }) => key),
    },
  ];
  await prisma.subscriptionPlan.update({
    where: { id: plan.id },
    data: {
      description: 'No-cost product evaluation with core attendance',
      isActive: true,
    },
  });
  await prisma.subscriptionPlanModule.createMany({
    data: [{ planId: plan.id, moduleId: attendanceModule.id }],
    skipDuplicates: true,
  });
  await prisma.subscriptionPlanCapability.deleteMany({
    where: { planId: plan.id },
  });
  await prisma.subscriptionPlanCapability.createMany({
    data: coreCapabilityKeys.map((key) => ({
      planId: plan.id,
      capabilityId: capabilityIdByKey.get(key),
    })),
  });
  for (const planSeed of seededPlans) {
    const { moduleKeys, capabilityKeys, ...data } = planSeed;
    const seededPlan = await prisma.subscriptionPlan.upsert({
      where: { name: data.name },
      update: { ...data, currency: 'OMR', isActive: true },
      create: { ...data, currency: 'OMR', isActive: true },
    });
    await prisma.subscriptionPlanModule.deleteMany({
      where: { planId: seededPlan.id },
    });
    await prisma.subscriptionPlanModule.createMany({
      data: moduleKeys.map((key) => ({
        planId: seededPlan.id,
        moduleId: moduleIdByKey.get(key),
      })),
    });
    await prisma.subscriptionPlanCapability.deleteMany({
      where: { planId: seededPlan.id },
    });
    await prisma.subscriptionPlanCapability.createMany({
      data: capabilityKeys.map((key) => ({
        planId: seededPlan.id,
        capabilityId: capabilityIdByKey.get(key),
      })),
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

  for (const tenantSeed of tenantSeeds) {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSeed.subdomain },
    });
    if (!tenant) continue;
    const activeEmployees = await prisma.employee.count({
      where: { tenantId: tenant.id, status: 'ACTIVE' },
    });
    await prisma.tenantSubscription.updateMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
      },
      data: { seatCount: activeEmployees },
    });
    await prisma.billingPaymentMethod.upsert({
      where: {
        gateway_providerMethodRef: {
          gateway: 'RAZORPAY',
          providerMethodRef: `seed_${tenantSeed.subdomain}_razorpay_method`,
        },
      },
      update: { status: 'ACTIVE', isDefault: true },
      create: {
        tenantId: tenant.id,
        gateway: 'RAZORPAY',
        providerMethodRef: `seed_${tenantSeed.subdomain}_razorpay_method`,
        methodType: 'CARD',
        displayName: 'Seed Visa',
        lastFour: '4242',
        expiryMonth: 12,
        expiryYear: 2030,
        isDefault: true,
      },
    });
  }

  await seedNotificationTemplates();
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

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');
const { randomUUID } = require('node:crypto');
const { seedCompletePayroll } = require('./seed-payroll');
require('dotenv').config();

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const SUBDOMAIN = 'muscat';
const PERIOD = '2026-06';
const PERIOD_START = new Date('2026-06-01T00:00:00.000Z');
const PERIOD_END = new Date('2026-06-30T00:00:00.000Z');
const FINALIZED_AT = new Date('2026-06-30T18:30:00.000Z');

const EMPLOYEES = [
  {
    code: 'MCT-001',
    fullName: 'Ahmed Al Balushi',
    workType: 'FIELD',
    dept: 'Operations',
    baseMinor: 1000000n,
    pattern: {
      absent: [8],
      halfDay: [15],
      leave: [22],
      overtime: { 7: 90, 14: 60, 21: 120 },
      late: { 3: 12, 10: 8 },
    },
  },
  {
    code: 'MCT-002',
    fullName: 'Fatima Al Lawati',
    workType: 'OFFICE',
    dept: 'Operations',
    baseMinor: 850000n,
    pattern: {
      absent: [],
      halfDay: [],
      leave: [],
      overtime: { 7: 45, 28: 60 },
      late: {},
    },
  },
  {
    code: 'MCT-003',
    fullName: 'Khalid Al Harthy',
    workType: 'FIELD',
    dept: 'Sales',
    baseMinor: 1200000n,
    pattern: {
      absent: [9, 16],
      halfDay: [23],
      leave: [],
      overtime: {},
      late: { 2: 15, 24: 6 },
    },
  },
  {
    code: 'MCT-004',
    fullName: 'Maryam Al Busaidi',
    workType: 'OFFICE',
    dept: 'Sales',
    baseMinor: 950000n,
    pattern: {
      absent: [],
      halfDay: [],
      leave: [],
      overtime: { 14: 30 },
      late: {},
    },
  },
  {
    code: 'MCT-005',
    fullName: 'Salim Al Riyami',
    workType: 'OFFICE',
    dept: 'People',
    baseMinor: 800000n,
    pattern: {
      absent: [10],
      halfDay: [17],
      leave: [24],
      overtime: { 21: 75 },
      late: { 4: 10 },
    },
  },
];

const WORKDAYS = [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30];

function dateAt(day, time) {
  return new Date(`2026-06-${String(day).padStart(2, '0')}T${time}Z`);
}

function workMinutes(checkin, checkout) {
  const diff = (checkout - checkin) / 60000;
  return Math.max(0, Math.round(diff - 60));
}

function logRow(employee, day) {
  const pattern = employee.pattern;
  const base = { employeeCode: employee.code, day };
  if (pattern.absent.includes(day)) {
    return { ...base, status: 'ABSENT' };
  }
  if (pattern.leave.includes(day)) {
    return { ...base, status: 'ON_LEAVE' };
  }
  if (pattern.halfDay.includes(day)) {
    const checkin = dateAt(day, '09:00:00');
    const checkout = dateAt(day, '13:00:00');
    return {
      ...base,
      status: 'HALF_DAY',
      checkin,
      checkout,
      overtimeMinutes: 0,
      lateMinutes: 0,
    };
  }
  const lateMinutes = pattern.late[day] ?? 0;
  const checkin = dateAt(day, '09:00:00');
  checkin.setUTCMinutes(checkin.getUTCMinutes() + lateMinutes);
  const overtime = pattern.overtime[day] ?? 0;
  const checkout = dateAt(day, '18:00:00');
  checkout.setUTCMinutes(checkout.getUTCMinutes() + overtime);
  return {
    ...base,
    status: 'PRESENT',
    checkin,
    checkout,
    overtimeMinutes: overtime,
    lateMinutes,
  };
}

async function seedAttendanceMonth(tenantId, shiftId, adminUserId) {
  const logsByEmployee = new Map();
  let eventCount = 0;
  for (const employee of EMPLOYEES) {
    const dbEmployee = await prisma.employee.findUnique({
      where: { tenantId_employeeCode: { tenantId, employeeCode: employee.code } },
    });
    const rows = [];
    for (const day of WORKDAYS) {
      const row = logRow(employee, day);
      const finalized = row.status === 'PRESENT' || row.status === 'HALF_DAY';
      const log = await prisma.attendanceLog.upsert({
        where: {
          tenantId_employeeId_attendanceDate: {
            tenantId,
            employeeId: dbEmployee.id,
            attendanceDate: dateAt(day, '00:00:00'),
          },
        },
        update: {
          firstCheckin: row.checkin ?? null,
          lastCheckout: row.checkout ?? null,
          totalWorkMinutes: row.checkin ? workMinutes(row.checkin, row.checkout) : 0,
          lateMinutes: row.lateMinutes ?? 0,
          overtimeMinutes: row.overtimeMinutes ?? 0,
          attendanceStatus: row.status,
          finalizedAt: finalized ? FINALIZED_AT : null,
        },
        create: {
          tenantId,
          employeeId: dbEmployee.id,
          attendanceDate: dateAt(day, '00:00:00'),
          appliedShiftId: shiftId,
          firstCheckin: row.checkin ?? null,
          lastCheckout: row.checkout ?? null,
          totalWorkMinutes: row.checkin ? workMinutes(row.checkin, row.checkout) : 0,
          lateMinutes: row.lateMinutes ?? 0,
          overtimeMinutes: row.overtimeMinutes ?? 0,
          earlyLeaveMinutes: 0,
          breakMinutes: 0,
          attendanceStatus: row.status,
          appliedPolicySnapshot: { source: 'seed', policyName: 'Default Office' },
          finalizedAt: finalized ? FINALIZED_AT : null,
        },
      });
      if (finalized) {
        await prisma.attendanceEvent.deleteMany({
          where: { tenantId, attendanceLogId: log.id },
        });
        await prisma.attendanceEvent.createMany({
          data: [
            {
              tenantId,
              attendanceLogId: log.id,
              employeeId: dbEmployee.id,
              eventType: 'CHECKIN',
              source: 'WEB',
              eventTime: row.checkin,
              clientEventUuid: randomUUID(),
              createdBy: adminUserId,
            },
            {
              tenantId,
              attendanceLogId: log.id,
              employeeId: dbEmployee.id,
              eventType: 'CHECKOUT',
              source: 'WEB',
              eventTime: row.checkout,
              clientEventUuid: randomUUID(),
              createdBy: adminUserId,
            },
          ],
        });
        eventCount += 2;
      }
      rows.push(log);
    }
    logsByEmployee.set(employee.code, rows);
  }
  return { logsByEmployee, eventCount };
}

function snapshotFor(logs) {
  let presentDays = 0;
  let halfDayDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let overtimeMinutes = 0;
  for (const log of logs) {
    if (log.attendanceStatus === 'PRESENT') presentDays += 1;
    else if (log.attendanceStatus === 'HALF_DAY') halfDayDays += 1;
    else if (log.attendanceStatus === 'ABSENT') absentDays += 1;
    else if (log.attendanceStatus === 'ON_LEAVE') leaveDays += 1;
    overtimeMinutes += log.overtimeMinutes;
  }
  return {
    payableDays: presentDays + halfDayDays,
    lossOfPayDays: absentDays,
    overtimeMinutes,
    snapshot: {
      workDays: logs.length,
      presentDays,
      halfDayDays,
      absentDays,
      leaveDays,
      overtimeMinutes,
      source: `attendance-lock:${PERIOD}`,
    },
  };
}

async function seedPayrollExportAndLock(tenantId, adminUserId) {
  const exportRow = await prisma.reportExport.findFirst({
    where: { tenantId, reportType: 'PAYROLL', period: PERIOD, contractVersion: 1 },
  });
  let reportExport;
  if (exportRow) {
    reportExport = await prisma.reportExport.update({
      where: { id: exportRow.id },
      data: {
        status: 'COMPLETED',
        objectKey: `private/${tenantId}/reports/payroll-${PERIOD}.csv`,
        checksum: `sha256:seed-${SUBDOMAIN}-${PERIOD}`,
        sourceCutoff: PERIOD_END,
        sourceWatermark: 'attendance-lock-v1:2026-06',
        completedAt: new Date('2026-07-01T06:00:00.000Z'),
      },
    });
  } else {
    reportExport = await prisma.reportExport.create({
      data: {
        tenantId,
        requestedBy: adminUserId,
        reportType: 'PAYROLL',
        period: PERIOD,
        format: 'CSV',
        contractVersion: 1,
        filters: { period: PERIOD },
        sourceCutoff: PERIOD_END,
        sourceWatermark: 'attendance-lock-v1:2026-06',
        status: 'COMPLETED',
        objectKey: `private/${tenantId}/reports/payroll-${PERIOD}.csv`,
        checksum: `sha256:seed-${SUBDOMAIN}-${PERIOD}`,
        completedAt: new Date('2026-07-01T06:00:00.000Z'),
      },
    });
  }

  const lock = await prisma.payrollLockPeriod.upsert({
    where: { tenantId_period: { tenantId, period: PERIOD } },
    update: {
      status: 'LOCKED',
      exportId: reportExport.id,
      lockedBy: adminUserId,
      lockedAt: new Date('2026-07-01T06:05:00.000Z'),
      reopenedBy: null,
      reopenedAt: null,
      reopenReason: null,
    },
    create: {
      tenantId,
      period: PERIOD,
      status: 'LOCKED',
      exportId: reportExport.id,
      lockedBy: adminUserId,
      lockedAt: new Date('2026-07-01T06:05:00.000Z'),
    },
  });

  const history = await prisma.payrollLockHistory.findFirst({
    where: { tenantId, payrollLockId: lock.id, action: 'LOCKED' },
  });
  if (!history) {
    await prisma.payrollLockHistory.create({
      data: {
        tenantId,
        payrollLockId: lock.id,
        action: 'LOCKED',
        actorUserId: adminUserId,
        exportId: reportExport.id,
        createdAt: new Date('2026-07-01T06:05:00.000Z'),
      },
    });
  }

  await prisma.attendanceLog.updateMany({
    where: { tenantId, attendanceDate: { gte: PERIOD_START, lte: PERIOD_END } },
    data: {
      lockedAt: new Date('2026-07-01T06:05:00.000Z'),
      lockedBy: adminUserId,
      payrollLockId: lock.id,
    },
  });

  return { reportExport, lock };
}

async function main() {
  let tenant = await prisma.tenant.findUnique({ where: { subdomain: SUBDOMAIN } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { companyName: 'Muscat Trading Co', subdomain: SUBDOMAIN, status: 'ACTIVE' },
    });
  }
  const tenantId = tenant.id;
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {
      timezone: 'Asia/Muscat',
      weeklyOffs: [
        { weekday: 'FRI', occurrences: [1, 2, 3, 4, 5] },
        { weekday: 'SAT', occurrences: [1, 2, 3, 4, 5] },
      ],
      workingDayStart: '09:00',
      workingDayEnd: '18:00',
    },
    create: {
      tenantId: tenant.id,
      timezone: 'Asia/Muscat',
      weeklyOffs: [
        { weekday: 'FRI', occurrences: [1, 2, 3, 4, 5] },
        { weekday: 'SAT', occurrences: [1, 2, 3, 4, 5] },
      ],
      workingDayStart: '09:00',
      workingDayEnd: '18:00',
    },
  });

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { name: 'Starter Trial' },
  });
  if (plan) {
    const subscription = await prisma.tenantSubscription.findFirst({
      where: { tenantId: tenant.id },
    });
    if (subscription) {
      await prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: { planId: plan.id, seatCount: 5, status: 'ACTIVE' },
      });
    } else {
      await prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          seatCount: 5,
          status: 'ACTIVE',
          currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
          currentPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
        },
      });
    }
  }

  const modules = await prisma.module.findMany({
    where: { key: { in: ['ATTENDANCE', 'PAYROLL', 'REGULARIZATION'] } },
  });
  for (const module of modules) {
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: module.id } },
      update: { isActive: true },
      create: {
        tenantId: tenant.id,
        moduleId: module.id,
        isActive: true,
        activatedAt: new Date(),
      },
    });
  }

  const permissions = await prisma.permission.findMany();
  const allKeys = new Set(permissions.map((permission) => permission.key));
  const roleSeeds = {
    BUSINESS_ADMIN: [...allKeys],
    HR_ADMIN: [...allKeys].filter(
      (key) =>
        !key.startsWith('billing.') &&
        key !== 'workspace.localization.manage' &&
        key !== 'workspace.localization.overrides.manage' &&
        key !== 'workspace.dashboard.admin.read',
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
      'mobile.runtime.read',
      'attendance.regularizations.self',
      'notifications.self',
      'leave.self',
    ],
  };
  const permissionIdByKey = new Map(
    permissions.map((permission) => [permission.key, permission.id]),
  );
  const roleIdByName = new Map();
  for (const [name, keys] of Object.entries(roleSeeds)) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: { isSystem: true },
      create: { tenantId: tenant.id, name, isSystem: true },
    });
    roleIdByName.set(name, role.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: keys
        .filter((key) => permissionIdByKey.has(key))
        .map((key) => ({ roleId: role.id, permissionId: permissionIdByKey.get(key) })),
    });
  }

  const defaultsAllowed = process.env.NODE_ENV !== 'production';
  const adminPassword = process.env.TENANT_ADMIN_PASSWORD ?? (defaultsAllowed ? 'TenantAdmin123!' : '');
  const hrPassword = process.env.TENANT_HR_PASSWORD ?? (defaultsAllowed ? 'TenantHr123!' : '');
  const employeePassword = process.env.MOBILE_EMPLOYEE_PASSWORD ?? (defaultsAllowed ? 'Employee123!' : '');
  if (!adminPassword || !hrPassword || !employeePassword) {
    throw new Error('Seed passwords are required in production');
  }
  const [adminHash, hrHash, employeeHash] = await Promise.all([
    argon2.hash(adminPassword),
    argon2.hash(hrPassword),
    argon2.hash(employeePassword),
  ]);

  async function upsertUser(email, passwordHash, roleId) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: { status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash },
      create: {
        tenantId: tenant.id,
        email,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });
    return user;
  }

  const adminUser = await upsertUser('admin@muscat.com', adminHash, roleIdByName.get('BUSINESS_ADMIN'));
  await upsertUser('hr@muscat.com', hrHash, roleIdByName.get('HR_ADMIN'));
  const employeeUser = await upsertUser('employee@muscat.com', employeeHash, roleIdByName.get('EMPLOYEE'));

  const departments = [];
  for (const name of ['Operations', 'Sales', 'People']) {
    let department = await prisma.department.findFirst({
      where: { tenantId, parentDeptId: null, name },
    });
    department ??= await prisma.department.create({ data: { tenantId, name } });
    departments.push(department);
  }
  const deptIdByName = new Map(departments.map((department) => [department.name, department.id]));

  const designation = await prisma.designation.upsert({
    where: { tenantId_name: { tenantId, name: 'Team Member' } },
    update: {},
    create: { tenantId, name: 'Team Member' },
  });

  const shift = await prisma.shift.upsert({
    where: { tenantId_name: { tenantId, name: 'General 09:00-18:00' } },
    update: {},
    create: {
      tenantId,
      name: 'General 09:00-18:00',
      startTime: new Date('1970-01-01T09:00:00.000Z'),
      endTime: new Date('1970-01-01T18:00:00.000Z'),
      isOvernight: false,
    },
  });

  const office = await prisma.officeLocation.upsert({
    where: { tenantId_officeName: { tenantId, officeName: 'Muscat HQ' } },
    update: {},
    create: {
      tenantId,
      officeName: 'Muscat HQ',
      latitude: 23.588,
      longitude: 58.3829,
      radiusMeters: 150,
      egressIps: ['203.0.113.50', '10.30.0.0/24'],
      wifiSsids: ['MCT-HQ'],
      timezone: 'Asia/Muscat',
    },
  });

  const policy = await prisma.attendancePolicy.upsert({
    where: { tenantId_name: { tenantId, name: 'Default Office' } },
    update: {},
    create: { tenantId, name: 'Default Office' },
  });
  const existingAssignment = await prisma.policyAssignment.findFirst({
    where: { tenantId, scope: 'TENANT_DEFAULT' },
  });
  if (existingAssignment) {
    await prisma.policyAssignment.update({
      where: { id: existingAssignment.id },
      data: { policyId: policy.id },
    });
  } else {
    await prisma.policyAssignment.create({
      data: { tenantId, policyId: policy.id, scope: 'TENANT_DEFAULT' },
    });
  }

  const employeeByCode = new Map();
  for (const seed of EMPLOYEES) {
    const employee = await prisma.employee.upsert({
      where: { tenantId_employeeCode: { tenantId, employeeCode: seed.code } },
      update: {
        fullName: seed.fullName,
        workType: seed.workType,
        deptId: deptIdByName.get(seed.dept),
        designationId: designation.id,
        defaultShiftId: shift.id,
        userId: seed.code === 'MCT-001' ? employeeUser.id : undefined,
      },
      create: {
        tenantId,
        employeeCode: seed.code,
        fullName: seed.fullName,
        workType: seed.workType,
        dateOfJoining: new Date('2025-11-01T00:00:00.000Z'),
        deptId: deptIdByName.get(seed.dept),
        designationId: designation.id,
        defaultShiftId: shift.id,
        userId: seed.code === 'MCT-001' ? employeeUser.id : undefined,
      },
    });
    employeeByCode.set(seed.code, employee);
    await prisma.employeeOfficeAssignment.upsert({
      where: {
        tenantId_employeeId_officeLocationId: {
          tenantId,
          employeeId: employee.id,
          officeLocationId: office.id,
        },
      },
      update: { isPrimary: true },
      create: {
        tenantId,
        employeeId: employee.id,
        officeLocationId: office.id,
        isPrimary: true,
      },
    });
  }

  const { logsByEmployee, eventCount } = await seedAttendanceMonth(
    tenant.id,
    shift.id,
    adminUser.id,
  );
  console.log(
    `Seeded ${WORKDAYS.length} workdays of June 2026 attendance for ${EMPLOYEES.length} employees (${eventCount} check-in/check-out events)`,
  );

  const { reportExport, lock } = await seedPayrollExportAndLock(tenant.id, adminUser.id);
  console.log(`Seeded completed payroll export ${reportExport.id} and locked period ${lock.period}`);

  const snapshotByCode = new Map();
  for (const seed of EMPLOYEES) {
    snapshotByCode.set(seed.code, snapshotFor(logsByEmployee.get(seed.code)));
  }

  const payrollLogs = await seedCompletePayroll(tenant.id, adminUser.id, {
    employeeCodes: EMPLOYEES.map((seed) => seed.code),
    baseMinorByCode: Object.fromEntries(
      EMPLOYEES.map((seed) => [seed.code, seed.baseMinor]),
    ),
    period: {
      periodKey: PERIOD,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      attendanceSource: `attendance-lock:${PERIOD}`,
      attendanceChecksum: `sha256:seed-${SUBDOMAIN}-${PERIOD}`,
      attendanceVersion: 'attendance-lock-v1',
    },
    snapshotByCode: Object.fromEntries(snapshotByCode),
    inputs: [
      {
        employeeCode: 'MCT-003',
        kind: 'ONE_TIME',
        code: 'BONUS',
        amountMinor: 75000n,
        currency: 'OMR',
        payload: { reason: 'June sales performance bonus' },
        idempotencyKey: `seed:${SUBDOMAIN}:${PERIOD}:bonus`,
      },
      {
        employeeCode: 'MCT-001',
        kind: 'ONE_TIME',
        code: 'OVERTIME_PAY',
        amountMinor: 30000n,
        currency: 'OMR',
        payload: { minutes: 270, rate: '1.25x' },
        idempotencyKey: `seed:${SUBDOMAIN}:${PERIOD}:overtime`,
      },
    ],
  });

  console.log(`Organization ${tenant.companyName} (${SUBDOMAIN}) is fully set up:`);
  console.log(`  - Login: admin@muscat.com / ${adminPassword} (or hr@muscat.com / ${hrPassword})`);
  console.log(`  - Attendance: June 2026 finalized + payroll period locked`);
  console.log(`  - Complete payroll configured for ${EMPLOYEES.length} employees`);
  for (const line of payrollLogs) console.log(`  - ${line}`);
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

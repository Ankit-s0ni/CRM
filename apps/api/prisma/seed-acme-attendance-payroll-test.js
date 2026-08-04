const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { seedCompletePayroll } = require('./seed-payroll');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const EMPLOYEES = [
  {
    code: 'ACME-001',
    baseMinor: 1000000n,
    pattern: {
      absent: [10],
      halfDay: [17],
      leave: [24],
      overtime: { 6: 60, 13: 90, 20: 45 },
      late: { 4: 12, 18: 8 },
    },
  },
  {
    code: 'ACME-002',
    baseMinor: 850000n,
    pattern: {
      absent: [12],
      halfDay: [19],
      leave: [],
      overtime: { 7: 45, 21: 60 },
      late: { 5: 10 },
    },
  },
];

const MONTHS = [
  { key: '2026-05', days: 31 },
  { key: '2026-06', days: 30 },
  { key: '2026-07', days: 31 },
];

function dateOnly(monthKey, day) {
  return new Date(`${monthKey}-${String(day).padStart(2, '0')}T00:00:00.000Z`);
}

function dateTime(monthKey, day, time) {
  return new Date(`${monthKey}-${String(day).padStart(2, '0')}T${time}.000Z`);
}

function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function workMinutes(checkin, checkout) {
  const diff = (checkout - checkin) / 60000;
  return Math.max(0, Math.round(diff - 60));
}

function payableFraction(status) {
  if (status === 'PRESENT' || status === 'ON_DUTY' || status === 'ON_LEAVE') {
    return 1;
  }
  if (status === 'HALF_DAY') return 0.5;
  if (status === 'WEEKLY_OFF' || status === 'HOLIDAY') return 1;
  return 0;
}

function statusFor(employeeSeed, monthKey, day) {
  const date = dateOnly(monthKey, day);
  if (isWeekend(date)) return 'WEEKLY_OFF';
  if (employeeSeed.pattern.absent.includes(day)) return 'ABSENT';
  if (employeeSeed.pattern.halfDay.includes(day)) return 'HALF_DAY';
  if (employeeSeed.pattern.leave.includes(day)) return 'ON_LEAVE';
  return 'PRESENT';
}

function logPayload(employeeSeed, monthKey, day) {
  const status = statusFor(employeeSeed, monthKey, day);
  if (status === 'PRESENT') {
    const lateMinutes = employeeSeed.pattern.late[day] ?? 0;
    const overtimeMinutes = employeeSeed.pattern.overtime[day] ?? 0;
    const checkin = dateTime(monthKey, day, '09:00:00');
    checkin.setUTCMinutes(checkin.getUTCMinutes() + lateMinutes);
    const checkout = dateTime(monthKey, day, '18:00:00');
    checkout.setUTCMinutes(checkout.getUTCMinutes() + overtimeMinutes);
    return { status, checkin, checkout, lateMinutes, overtimeMinutes };
  }
  if (status === 'HALF_DAY') {
    return {
      status,
      checkin: dateTime(monthKey, day, '09:00:00'),
      checkout: dateTime(monthKey, day, '13:00:00'),
      lateMinutes: 0,
      overtimeMinutes: 0,
    };
  }
  return {
    status,
    checkin: null,
    checkout: null,
    lateMinutes: 0,
    overtimeMinutes: 0,
  };
}

async function seedAttendanceForEmployee(tenantId, adminUserId, shiftId, employee) {
  const summaries = [];
  for (const month of MONTHS) {
    const counters = {
      PRESENT: 0,
      HALF_DAY: 0,
      ABSENT: 0,
      ON_LEAVE: 0,
      WEEKLY_OFF: 0,
      HOLIDAY: 0,
      ON_DUTY: 0,
    };
    let payableDays = 0;
    let lossOfPayDays = 0;
    let overtimeMinutes = 0;

    for (let day = 1; day <= month.days; day += 1) {
      const payload = logPayload(employee.seed, month.key, day);
      counters[payload.status] += 1;
      payableDays += payableFraction(payload.status);
      overtimeMinutes += payload.overtimeMinutes;
      if (payload.status === 'ABSENT') lossOfPayDays += 1;

      const attendanceDate = dateOnly(month.key, day);
      const finalizedAt = new Date(
        `${month.key}-${String(month.days).padStart(2, '0')}T18:30:00.000Z`,
      );
      const log = await prisma.attendanceLog.upsert({
        where: {
          tenantId_employeeId_attendanceDate: {
            tenantId,
            employeeId: employee.id,
            attendanceDate,
          },
        },
        update: {
          appliedShiftId: shiftId,
          firstCheckin: payload.checkin,
          lastCheckout: payload.checkout,
          totalWorkMinutes: payload.checkin
            ? workMinutes(payload.checkin, payload.checkout)
            : 0,
          lateMinutes: payload.lateMinutes,
          overtimeMinutes: payload.overtimeMinutes,
          earlyLeaveMinutes: 0,
          breakMinutes: 0,
          attendanceStatus: payload.status,
          appliedPolicySnapshot: {
            source: 'seed-acme-attendance-payroll-test',
            month: month.key,
          },
          finalizedAt,
        },
        create: {
          tenantId,
          employeeId: employee.id,
          attendanceDate,
          appliedShiftId: shiftId,
          firstCheckin: payload.checkin,
          lastCheckout: payload.checkout,
          totalWorkMinutes: payload.checkin
            ? workMinutes(payload.checkin, payload.checkout)
            : 0,
          lateMinutes: payload.lateMinutes,
          overtimeMinutes: payload.overtimeMinutes,
          earlyLeaveMinutes: 0,
          breakMinutes: 0,
          attendanceStatus: payload.status,
          appliedPolicySnapshot: {
            source: 'seed-acme-attendance-payroll-test',
            month: month.key,
          },
          finalizedAt,
        },
      });

      await prisma.attendanceEvent.deleteMany({
        where: { tenantId, attendanceLogId: log.id },
      });
      if (payload.checkin && payload.checkout) {
        await prisma.attendanceEvent.createMany({
          data: [
            {
              tenantId,
              attendanceLogId: log.id,
              employeeId: employee.id,
              eventType: 'CHECKIN',
              source: 'WEB',
              eventTime: payload.checkin,
              clientEventUuid: randomUUID(),
              createdBy: adminUserId,
            },
            {
              tenantId,
              attendanceLogId: log.id,
              employeeId: employee.id,
              eventType: 'CHECKOUT',
              source: 'WEB',
              eventTime: payload.checkout,
              clientEventUuid: randomUUID(),
              createdBy: adminUserId,
            },
          ],
        });
      }
    }

    summaries.push({
      employeeCode: employee.employeeCode,
      month: month.key,
      totalLogs: month.days,
      payableDays,
      lossOfPayDays,
      overtimeMinutes,
      counters,
    });
  }
  return summaries;
}

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'acme' },
  });
  if (!tenant) throw new Error('Acme tenant not found. Run the main seed first.');

  const admin = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: 'admin@acme.com' },
  });
  if (!admin) throw new Error('admin@acme.com user not found.');

  const shift = await prisma.shift.findFirst({
    where: { tenantId: tenant.id, name: 'Morning 09:00-18:00' },
  });
  if (!shift) throw new Error('Default Acme shift not found.');

  await seedCompletePayroll(tenant.id, admin.id, {
    employeeCodes: EMPLOYEES.map((employee) => employee.code),
    baseMinorByCode: Object.fromEntries(
      EMPLOYEES.map((employee) => [employee.code, employee.baseMinor]),
    ),
    period: {
      periodKey: '2026-05',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      attendanceSource: 'attendance-period:2026-05',
      attendanceChecksum: 'sha256:seed-acme-attendance-2026-05',
      attendanceVersion: 'attendance-period-v1',
    },
    snapshotByCode: {},
    inputs: [],
  });

  const dbEmployees = [];
  for (const seed of EMPLOYEES) {
    const employee = await prisma.employee.findUnique({
      where: {
        tenantId_employeeCode: {
          tenantId: tenant.id,
          employeeCode: seed.code,
        },
      },
    });
    if (!employee) throw new Error(`${seed.code} not found.`);
    dbEmployees.push({ ...employee, seed });
  }

  const summaries = [];
  for (const employee of dbEmployees) {
    summaries.push(
      ...(await seedAttendanceForEmployee(
        tenant.id,
        admin.id,
        shift.id,
        employee,
      )),
    );
  }

  console.log('Seeded Acme payroll setup and attendance for ACME-001 and ACME-002.');
  for (const summary of summaries) {
    console.log(
      [
        summary.employeeCode,
        summary.month,
        `logs=${summary.totalLogs}`,
        `payable=${summary.payableDays}`,
        `lop=${summary.lossOfPayDays}`,
        `ot=${summary.overtimeMinutes}m`,
        `present=${summary.counters.PRESENT}`,
        `half=${summary.counters.HALF_DAY}`,
        `leave=${summary.counters.ON_LEAVE}`,
        `weeklyOff=${summary.counters.WEEKLY_OFF}`,
        `absent=${summary.counters.ABSENT}`,
      ].join(' | '),
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

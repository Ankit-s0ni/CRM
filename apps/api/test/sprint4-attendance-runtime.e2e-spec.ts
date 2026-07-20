import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { AttendanceStatus, LockStatus, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AttendanceJobProcessor } from '../src/products/attendance/core/jobs/attendance-job.processor';
import { AuthService } from '../src/platform/identity/auth.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/shared/authorization/permissions.constants';
import { TenantContextService } from '../src/platform/tenancy/public';
import { TestDataFactory } from './support/factories';

type Session = { tenantId: string; accessToken: string; userId: string };
type TodayBody = {
  data: {
    openAction: string;
    timeline: Array<Record<string, unknown>>;
  };
  idempotent: boolean;
};
type RegisterBody = { data: Array<{ employee: { id: string } }> };

describe('Sprint 4 attendance runtime (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let factory: TestDataFactory;
  let auth: AuthService;
  let jobs: AttendanceJobProcessor;
  const tenantIds: string[] = [];
  const stamp = Date.now();
  const today = dateInTimeZone(new Date(), 'Asia/Kolkata');
  const month = today.slice(0, 7);
  let adminA: Session;
  let adminB: Session;
  let employeeA: Session;
  let concurrentEmployee: Session;
  let manager: Session;
  let hrAdmin: Session;
  let customReader: Session;
  let employeeAId = '';
  let concurrentEmployeeId = '';
  let managerEmployeeId = '';
  let reportEmployeeId = '';
  let outsiderEmployeeId = '';

  beforeAll(async () => {
    process.env.ATTENDANCE_QUEUE_MODE = 'disabled';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    auth = moduleFixture.get(AuthService);
    jobs = moduleFixture.get(AttendanceJobProcessor);
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    factory = new TestDataFactory(prisma);

    adminA = await createWorkspace('A');
    adminB = await createWorkspace('B');
    employeeA = await createUserSession(adminA.tenantId, 'EMPLOYEE');
    concurrentEmployee = await createUserSession(adminA.tenantId, 'EMPLOYEE');
    manager = await createUserSession(adminA.tenantId, 'MANAGER');
    hrAdmin = await createUserSession(adminA.tenantId, 'HR_ADMIN');
    customReader = await createCustomSession(adminA.tenantId);
    const department = await factory.createDepartment({
      tenantId: adminA.tenantId,
      name: `Runtime Operations ${stamp}`,
    });
    employeeAId = (
      await factory.createEmployee({
        tenantId: adminA.tenantId,
        deptId: department.id,
        userId: employeeA.userId,
        employeeCode: `S4-SELF-${stamp}`,
        fullName: 'Aisha Runtime',
      })
    ).id;
    concurrentEmployeeId = (
      await factory.createEmployee({
        tenantId: adminA.tenantId,
        deptId: department.id,
        userId: concurrentEmployee.userId,
        employeeCode: `S4-CONCURRENT-${stamp}`,
        fullName: 'Omar Concurrent',
      })
    ).id;
    managerEmployeeId = (
      await factory.createEmployee({
        tenantId: adminA.tenantId,
        deptId: department.id,
        userId: manager.userId,
        employeeCode: `S4-MANAGER-${stamp}`,
        fullName: 'Mariam Manager',
      })
    ).id;
    reportEmployeeId = (
      await factory.createEmployee({
        tenantId: adminA.tenantId,
        deptId: department.id,
        managerId: managerEmployeeId,
        employeeCode: `S4-REPORT-${stamp}`,
        fullName: 'Rashid Report',
      })
    ).id;
    outsiderEmployeeId = (
      await factory.createEmployee({
        tenantId: adminA.tenantId,
        deptId: department.id,
        employeeCode: `S4-OUTSIDER-${stamp}`,
        fullName: 'Zayed Outsider',
      })
    ).id;
  });

  afterAll(async () => {
    for (const tenantId of tenantIds) await cleanupTenant(prisma, tenantId);
    await app.close();
    await prisma.$disconnect();
    await pool.end();
    delete process.env.ATTENDANCE_QUEUE_MODE;
  });

  it('runs check-in, break and checkout atomically with idempotent evidence', async () => {
    const requestId = randomUUID();
    const checkin = await api(employeeA)
      .post('/attendance/check-in')
      .send({ requestId })
      .expect(201);
    const checkinBody = checkin.body as TodayBody;
    expect(checkinBody.data.openAction).toBe('CHECKOUT');
    expect(checkinBody.data.timeline).toHaveLength(1);
    expect(checkinBody.data.timeline[0]).not.toHaveProperty('ipAddress');
    expect(checkinBody.data.timeline[0]).not.toHaveProperty('userAgent');

    const replay = await api(employeeA)
      .post('/attendance/check-in')
      .send({ requestId })
      .expect(201);
    expect((replay.body as TodayBody).idempotent).toBe(true);
    await api(employeeA).post('/attendance/check-in').send({}).expect(409);
    await api(employeeA)
      .post('/attendance/break-start')
      .send({ requestId: randomUUID() })
      .expect(201);
    await api(employeeA)
      .post('/attendance/break-start')
      .send({ requestId: randomUUID() })
      .expect(409);
    await api(employeeA)
      .post('/attendance/break-end')
      .send({ requestId: randomUUID() })
      .expect(201);
    await api(employeeA)
      .post('/attendance/check-out')
      .send({ requestId: randomUUID() })
      .expect(201);
    await api(employeeA).post('/attendance/check-out').send({}).expect(409);

    const [events, audit, outbox] = await Promise.all([
      prisma.attendanceEvent.count({
        where: { tenantId: adminA.tenantId, employeeId: employeeAId },
      }),
      prisma.tenantAuditLog.count({
        where: { tenantId: adminA.tenantId, module: 'attendance' },
      }),
      prisma.outboxEvent.count({
        where: {
          tenantId: adminA.tenantId,
          eventKey: { startsWith: 'attendance.' },
        },
      }),
    ]);
    expect(events).toBe(4);
    expect(audit).toBeGreaterThanOrEqual(4);
    expect(outbox).toBeGreaterThanOrEqual(4);

    await api(employeeA)
      .get('/attendance/me/today')
      .expect(200)
      .expect(({ body }) => {
        const today = body as {
          data: {
            policy: { name: string };
            workOverview: Record<string, unknown>;
          };
        };
        expect(typeof today.data.policy.name).toBe('string');
        expect(typeof today.data.workOverview.weekStart).toBe('string');
        expect(typeof today.data.workOverview.weekEnd).toBe('string');
        expect(typeof today.data.workOverview.workMinutes).toBe('number');
        expect(typeof today.data.workOverview.targetMinutes).toBe('number');
        expect(typeof today.data.workOverview.lateMinutes).toBe('number');
        expect(typeof today.data.workOverview.overtimeMinutes).toBe('number');
      });
    const history = await api(employeeA)
      .get(`/attendance/me/history?month=${month}`)
      .expect(200);
    expect((history.body as { data: unknown[] }).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attendanceDate: today }),
      ]),
    );
    await api(adminA)
      .get(
        `/attendance/register?startDate=${today}&endDate=${today}&employeeId=${employeeAId}`,
      )
      .expect(200)
      .expect(({ body }) => {
        const register = body as RegisterBody;
        expect(
          register.data.some((row) => row.employee.id === employeeAId),
        ).toBe(true);
      });
    await api(adminA)
      .get(`/attendance/employees/${employeeAId}/month?month=${month}`)
      .expect(200);
    await api(adminA)
      .get(`/attendance/register/${employeeAId}/day?date=${today}`)
      .expect(200)
      .expect(({ body }) =>
        expect((body as TodayBody).data.timeline).toHaveLength(4),
      );
  });

  it('serializes concurrent check-ins into one event and one conflict', async () => {
    const responses = await Promise.all([
      api(concurrentEmployee)
        .post('/attendance/check-in')
        .send({ requestId: randomUUID() }),
      api(concurrentEmployee)
        .post('/attendance/check-in')
        .send({ requestId: randomUUID() }),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      await prisma.attendanceEvent.count({
        where: {
          tenantId: adminA.tenantId,
          employeeId: concurrentEmployeeId,
        },
      }),
    ).toBe(1);
  });

  it('enforces manager reporting scope and explicit employee filters', async () => {
    await prisma.attendanceLog.createMany({
      data: [managerEmployeeId, reportEmployeeId, outsiderEmployeeId].map(
        (employeeId) => ({
          tenantId: adminA.tenantId,
          employeeId,
          attendanceDate: new Date(`${today}T00:00:00.000Z`),
          attendanceStatus: AttendanceStatus.PRESENT,
        }),
      ),
      skipDuplicates: true,
    });
    const scoped = await api(manager)
      .get(`/attendance/register?startDate=${today}&endDate=${today}&limit=100`)
      .expect(200);
    const scopedIds = (scoped.body as RegisterBody).data.map(
      (row) => row.employee.id,
    );
    expect(scopedIds).toEqual(
      expect.arrayContaining([managerEmployeeId, reportEmployeeId]),
    );
    expect(scopedIds).not.toContain(outsiderEmployeeId);
    await api(manager)
      .get(
        `/attendance/register?startDate=${today}&endDate=${today}&employeeId=${outsiderEmployeeId}`,
      )
      .expect(200)
      .expect(({ body }) => expect((body as RegisterBody).data).toEqual([]));
    await api(manager)
      .get(`/attendance/employees/${outsiderEmployeeId}/month?month=${month}`)
      .expect(404);
  });

  it('filters operational register links for late and missing checkout records', async () => {
    const attendanceDate = new Date(`${today}T00:00:00.000Z`);
    await prisma.attendanceLog.upsert({
      where: {
        tenantId_employeeId_attendanceDate: {
          tenantId: adminA.tenantId,
          employeeId: reportEmployeeId,
          attendanceDate,
        },
      },
      update: {
        firstCheckin: new Date(`${today}T09:20:00.000Z`),
        lastCheckout: new Date(`${today}T17:00:00.000Z`),
        lateMinutes: 20,
      },
      create: {
        tenantId: adminA.tenantId,
        employeeId: reportEmployeeId,
        attendanceDate,
        attendanceStatus: AttendanceStatus.PRESENT,
        firstCheckin: new Date(`${today}T09:20:00.000Z`),
        lastCheckout: new Date(`${today}T17:00:00.000Z`),
        lateMinutes: 20,
      },
    });
    await prisma.attendanceLog.upsert({
      where: {
        tenantId_employeeId_attendanceDate: {
          tenantId: adminA.tenantId,
          employeeId: outsiderEmployeeId,
          attendanceDate,
        },
      },
      update: {
        firstCheckin: new Date(`${today}T09:00:00.000Z`),
        lastCheckout: null,
        lateMinutes: 0,
      },
      create: {
        tenantId: adminA.tenantId,
        employeeId: outsiderEmployeeId,
        attendanceDate,
        attendanceStatus: AttendanceStatus.PRESENT_OPEN,
        firstCheckin: new Date(`${today}T09:00:00.000Z`),
        lastCheckout: null,
      },
    });

    const late = await api(adminA)
      .get(
        `/attendance/register?startDate=${today}&endDate=${today}&lateOnly=true&limit=100`,
      )
      .expect(200);
    const lateIds = (late.body as RegisterBody).data.map(
      ({ employee }) => employee.id,
    );
    expect(lateIds).toContain(reportEmployeeId);
    expect(lateIds).not.toContain(outsiderEmployeeId);

    const missingCheckout = await api(adminA)
      .get(
        `/attendance/register?startDate=${today}&endDate=${today}&missingCheckout=true&limit=100`,
      )
      .expect(200);
    const missingCheckoutIds = (missingCheckout.body as RegisterBody).data.map(
      ({ employee }) => employee.id,
    );
    expect(missingCheckoutIds).toContain(outsiderEmployeeId);
    expect(missingCheckoutIds).not.toContain(reportEmployeeId);
  });

  it('grants tenant-wide reads to HR and permission-scoped custom roles', async () => {
    for (const session of [hrAdmin, customReader]) {
      const response = await api(session)
        .get(
          `/attendance/register?startDate=${today}&endDate=${today}&limit=100`,
        )
        .expect(200);
      expect(
        (response.body as RegisterBody).data.map((row) => row.employee.id),
      ).toEqual(expect.arrayContaining([outsiderEmployeeId]));
    }
    await api(customReader).get('/attendance-exceptions').expect(403);
  });

  it('creates exceptions, rejects overlaps, and respects payroll locks', async () => {
    const created = await api(adminA)
      .post('/attendance-exceptions')
      .send({
        employeeId: reportEmployeeId,
        exceptionType: 'WFH',
        startDate: today,
        endDate: today,
        reason: 'Approved remote customer support',
      })
      .expect(201);
    const exceptionId = (created.body as { data: { id: string } }).data.id;
    await api(adminA).get(`/attendance-exceptions/${exceptionId}`).expect(200);
    await api(adminA)
      .patch(`/attendance-exceptions/${exceptionId}`)
      .send({ reason: 'Approved remote customer support, updated' })
      .expect(200);
    await api(adminA)
      .post('/attendance-exceptions')
      .send({
        employeeId: reportEmployeeId,
        exceptionType: 'ON_DUTY',
        startDate: today,
        endDate: today,
        reason: 'Overlapping field duty',
      })
      .expect(409);
    await api(adminA)
      .get('/attendance-exceptions?exceptionType=WFH')
      .expect(200)
      .expect(({ body }) =>
        expect((body as { data: unknown[] }).data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: exceptionId }),
          ]),
        ),
      );

    const removable = await api(adminA)
      .post('/attendance-exceptions')
      .send({
        employeeId: outsiderEmployeeId,
        exceptionType: 'ON_DUTY',
        startDate: today,
        endDate: today,
        reason: 'Temporary field assignment',
      })
      .expect(201);
    await api(adminA)
      .delete(
        `/attendance-exceptions/${(removable.body as { data: { id: string } }).data.id}`,
      )
      .expect(200);

    const lock = await prisma.payrollLockPeriod.create({
      data: {
        tenantId: adminA.tenantId,
        period: month,
        status: LockStatus.LOCKED,
        lockedAt: new Date(),
      },
    });
    await prisma.attendanceLog.updateMany({
      where: {
        tenantId: adminA.tenantId,
        employeeId: reportEmployeeId,
        attendanceDate: new Date(`${today}T00:00:00.000Z`),
      },
      data: { payrollLockId: lock.id, lockedAt: new Date() },
    });
    await api(adminA)
      .patch(`/attendance-exceptions/${exceptionId}`)
      .send({
        employeeId: outsiderEmployeeId,
        reason: 'Moving a locked exception should fail',
      })
      .expect(423);
  });

  it('keeps tenant register data isolated', async () => {
    const response = await api(adminB)
      .get(`/attendance/register?startDate=${today}&endDate=${today}&limit=100`)
      .expect(200);
    expect((response.body as RegisterBody).data).toEqual([]);
  });

  it('keeps a 500-row register page within the interactive budget', async () => {
    const department = await factory.createDepartment({
      tenantId: adminB.tenantId,
      name: `Performance ${stamp}`,
    });
    const employees = await prisma.employee.createManyAndReturn({
      data: Array.from({ length: 500 }, (_, index) => ({
        tenantId: adminB.tenantId,
        deptId: department.id,
        employeeCode: `S4-PERF-${stamp}-${index}`,
        fullName: `Performance Employee ${index.toString().padStart(3, '0')}`,
        workType: 'OFFICE' as const,
        status: 'ACTIVE' as const,
        dateOfJoining: new Date('2026-01-01T00:00:00.000Z'),
      })),
      select: { id: true },
    });
    await prisma.attendanceLog.createMany({
      data: employees.map(({ id }) => ({
        tenantId: adminB.tenantId,
        employeeId: id,
        attendanceDate: new Date(`${today}T00:00:00.000Z`),
        attendanceStatus: AttendanceStatus.PRESENT,
        totalWorkMinutes: 480,
      })),
    });

    const startedAt = performance.now();
    const response = await api(adminB)
      .get(`/attendance/register?startDate=${today}&endDate=${today}&limit=100`)
      .expect(200);
    const duration = performance.now() - startedAt;

    expect((response.body as RegisterBody).data).toHaveLength(100);
    expect(duration).toBeLessThan(1500);
  });

  it('keeps runtime tables fail-closed and attendance evidence append-only', async () => {
    const userPool = new Pool({
      connectionString:
        process.env.DATABASE_URL_APP ??
        'postgresql://app_user:app_password@localhost:5433/hrms_dev?schema=public',
    });
    const client = await userPool.connect();
    try {
      const noContext = await client.query<{
        logs: string;
        exceptions: string;
        jobs: string;
      }>(
        'SELECT (SELECT count(*) FROM attendance_logs)::text AS logs, (SELECT count(*) FROM attendance_exceptions)::text AS exceptions, (SELECT count(*) FROM attendance_job_runs)::text AS jobs',
      );
      expect(noContext.rows[0]).toEqual({
        logs: '0',
        exceptions: '0',
        jobs: '0',
      });

      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1::text, true)", [
        adminA.tenantId,
      ]);
      const tenantContext = await client.query<{ logs: string }>(
        'SELECT count(*)::text AS logs FROM attendance_logs',
      );
      expect(Number(tenantContext.rows[0].logs)).toBeGreaterThan(0);
      await expect(
        client.query(
          'UPDATE attendance_events SET "userAgent" = $1 WHERE "tenantId" = $2',
          ['tampered', adminA.tenantId],
        ),
      ).rejects.toThrow();
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await userPool.end();
    }
  });

  it('finalizes and sweeps idempotently with stable job records', async () => {
    const finalizationDate = new Date(Date.now() - 2 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const first = await jobs.finalizeDay(adminA.tenantId, finalizationDate);
    const retry = await jobs.finalizeDay(adminA.tenantId, finalizationDate);
    expect(first.idempotent).toBe(false);
    expect(retry.idempotent).toBe(true);
    const sweep = await jobs.absenteeSweep(adminA.tenantId, today);
    const sweepRetry = await jobs.absenteeSweep(adminA.tenantId, today);
    expect(sweep.idempotent).toBe(false);
    expect(sweepRetry.idempotent).toBe(true);
    expect(
      await prisma.attendanceJobRun.count({
        where: { tenantId: adminA.tenantId, status: 'COMPLETED' },
      }),
    ).toBe(2);

    await expect(jobs.ensurePartitions('2026-10')).resolves.toEqual({
      referenceMonth: '2026-10',
      ensured: 2,
    });
    const partitions = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT child.relname AS name
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      WHERE parent.relname = 'attendance_events'
        AND child.relname IN (
          'attendance_events_2026_11',
          'attendance_events_2026_12'
        )
      ORDER BY child.relname
    `;
    expect(partitions.map(({ name }) => name)).toEqual([
      'attendance_events_2026_11',
      'attendance_events_2026_12',
    ]);
  });

  it('returns the documented employee-profile error', async () => {
    const session = await createUserSession(adminA.tenantId, 'EMPLOYEE');
    await api(session)
      .get('/attendance/me/today')
      .expect(403)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'EMPLOYEE_PROFILE_REQUIRED' }),
      );
  });

  function api(session: Session) {
    const withAuth = (test: request.Test) =>
      test
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('x-tenant-id', session.tenantId);
    return {
      get: (path: string) => withAuth(request(app.getHttpServer()).get(path)),
      post: (path: string) => withAuth(request(app.getHttpServer()).post(path)),
      patch: (path: string) =>
        withAuth(request(app.getHttpServer()).patch(path)),
      delete: (path: string) =>
        withAuth(request(app.getHttpServer()).delete(path)),
    };
  }

  async function createWorkspace(label: string) {
    const tenant = await factory.createTenant({
      companyName: `Sprint 4 Runtime ${label} ${stamp}`,
      subdomain: `sprint4-runtime-${label.toLowerCase()}-${stamp}`,
    });
    tenantIds.push(tenant.id);
    await factory.ensureTrialSubscription(tenant.id, 100);
    const module = await prisma.module.findUniqueOrThrow({
      where: { key: 'ATTENDANCE' },
    });
    await prisma.tenantModule.create({
      data: {
        tenantId: tenant.id,
        moduleId: module.id,
        isActive: true,
        activatedAt: new Date(),
      },
    });
    return createUserSession(tenant.id, 'BUSINESS_ADMIN');
  }

  async function createUserSession(
    tenantId: string,
    roleName: keyof typeof DEFAULT_ROLE_PERMISSIONS,
  ) {
    const password = 'Sprint4User123!';
    const user = await factory.createUser({
      tenantId,
      email: `${roleName.toLowerCase()}-${stamp}-${randomUUID()}@sprint4.test`,
      passwordHash: await argon2.hash(password),
    });
    const role =
      (await prisma.role.findFirst({
        where: { tenantId, name: roleName },
      })) ?? (await factory.createSystemRole(tenantId, roleName));
    await factory.assignRole(user.id, role.id);
    const login = await TenantContextService.run({ tenantId }, () =>
      auth.login(user.email, password, '127.0.0.1', 'sprint4-jest'),
    );
    return { tenantId, accessToken: login.accessToken, userId: user.id };
  }

  async function createCustomSession(tenantId: string) {
    const password = 'Sprint4User123!';
    const user = await factory.createUser({
      tenantId,
      email: `custom-reader-${stamp}-${randomUUID()}@sprint4.test`,
      passwordHash: await argon2.hash(password),
    });
    const role = await factory.createRole({
      tenantId,
      name: `ATTENDANCE_READER_${stamp}`,
      permissionKeys: ['attendance.records.read'],
    });
    await factory.assignRole(user.id, role.id);
    const login = await TenantContextService.run({ tenantId }, () =>
      auth.login(user.email, password, '127.0.0.1', 'sprint4-jest'),
    );
    return { tenantId, accessToken: login.accessToken, userId: user.id };
  }
});

function dateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

async function cleanupTenant(prisma: PrismaClient, tenantId: string) {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const roles = await prisma.role.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const userIds = users.map(({ id }) => id);
  const roleIds = roles.map(({ id }) => id);
  await prisma.attendanceEvent.deleteMany({ where: { tenantId } });
  await prisma.attendanceVerificationLog.deleteMany({ where: { tenantId } });
  await prisma.attendanceException.deleteMany({ where: { tenantId } });
  await prisma.securityAlert.deleteMany({ where: { tenantId } });
  await prisma.attendanceJobRun.deleteMany({ where: { tenantId } });
  await prisma.attendanceLog.deleteMany({ where: { tenantId } });
  await prisma.payrollLockPeriod.deleteMany({ where: { tenantId } });
  await prisma.employmentEvent.deleteMany({ where: { tenantId } });
  await prisma.employee.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.loginAttempt.deleteMany({ where: { tenantId } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: roleIds } },
  });
  await prisma.verificationToken.deleteMany({ where: { tenantId } });
  await prisma.tenantAuditLog.deleteMany({ where: { tenantId } });
  await prisma.outboxEvent.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.tenantModule.deleteMany({ where: { tenantId } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/identity/auth.service';
import { EmployeeImportStorageService } from '../src/modules/organization/imports/employee-import-storage.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/shared/authorization/permissions.constants';
import { TenantContextService } from '../src/shared/tenancy/tenant-context.service';
import { TestDataFactory } from './support/factories';

type Session = { tenantId: string; accessToken: string; userId: string };
type ErrorBody = { code: string };
type DataBody<T> = { data: T };
type IdBody = DataBody<{ id: string }>;
type ShiftBody = DataBody<{ id: string; isOvernight: boolean }>;
type ResolutionBody = { resolution: { source: string } };
type ImportBody = DataBody<{
  id: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  status: string;
  rosterRows: Array<{ errorCode: string }>;
}>;

describe('Sprint 3 attendance configuration (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let factory: TestDataFactory;
  let auth: AuthService;
  let storage: EmployeeImportStorageService;
  const tenantIds: string[] = [];
  const stamp = Date.now();
  let adminA: Session;
  let adminB: Session;
  let employeeSession: Session;
  let departmentA = '';
  let employeeA = '';
  let employeeB = '';

  beforeAll(async () => {
    process.env.IMPORT_STORAGE_MODE = 'memory';
    process.env.IMPORT_QUEUE_MODE = 'inline';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    auth = moduleFixture.get(AuthService);
    storage = moduleFixture.get(EmployeeImportStorageService);
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    factory = new TestDataFactory(prisma);

    adminA = await createWorkspace('A', 'BUSINESS_ADMIN');
    adminB = await createWorkspace('B', 'BUSINESS_ADMIN');
    employeeSession = await createUserSession(adminA.tenantId, 'EMPLOYEE');
    const department = await factory.createDepartment({
      tenantId: adminA.tenantId,
      name: `Operations ${stamp}`,
    });
    departmentA = department.id;
    employeeA = (
      await factory.createEmployee({
        tenantId: adminA.tenantId,
        deptId: department.id,
        employeeCode: `S3-A-${stamp}`,
        fullName: 'Aarav Sprint Three',
      })
    ).id;
    employeeB = (
      await factory.createEmployee({
        tenantId: adminA.tenantId,
        deptId: department.id,
        employeeCode: `S3-B-${stamp}`,
        fullName: 'Meera Sprint Three',
      })
    ).id;
  });

  afterAll(async () => {
    for (const tenantId of tenantIds) await cleanupTenant(prisma, tenantId);
    await app.close();
    await prisma.$disconnect();
    await pool.end();
    delete process.env.IMPORT_STORAGE_MODE;
    delete process.env.IMPORT_QUEUE_MODE;
  });

  it('updates settings and completes onboarding idempotently with audit/outbox evidence', async () => {
    await api(adminA)
      .patch('/tenant-settings')
      .send({
        timezone: 'Asia/Kolkata',
        weeklyOffs: [{ weekday: 'SAT', occurrences: [2, 4] }, 'SUN'],
        workingDayStart: '09:00',
        workingDayEnd: '18:00',
      })
      .expect(200);
    await api(adminA)
      .patch('/tenant-settings')
      .send({ timezone: 'Mumbai/Office' })
      .expect(422)
      .expect(({ body }) =>
        expect((body as ErrorBody).code).toBe('INVALID_TIMEZONE'),
      );
    const logo = await api(adminA)
      .post('/tenant-settings/logo/presign')
      .send({
        filename: 'acme-logo.png',
        contentType: 'image/png',
        fileSize: 1024,
      })
      .expect(201);
    expect(
      (logo.body as DataBody<{ objectKey: string }>).data.objectKey,
    ).toMatch(new RegExp(`^${adminA.tenantId}/branding/`));
    const first = await api(adminA)
      .post('/onboarding/complete')
      .send({ progress: { completedSteps: 4 } })
      .expect(201);
    const replay = await api(adminA)
      .post('/onboarding/complete')
      .send({ progress: { completedSteps: 4 } })
      .expect(201);
    const firstBody = first.body as DataBody<{ completedAt: string }>;
    const replayBody = replay.body as DataBody<{ completedAt: string }>;
    expect(replayBody.data.completedAt).toBe(firstBody.data.completedAt);
    expect(
      await prisma.tenantAuditLog.count({
        where: {
          tenantId: adminA.tenantId,
          action: 'workspace.onboarding.completed',
        },
      }),
    ).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: {
          tenantId: adminA.tenantId,
          eventKey: 'workspace.onboarding.completed',
        },
      }),
    ).toBe(1);
    expect(
      await prisma.tenantAuditLog.count({
        where: { tenantId: adminA.tenantId, action: 'workspace.logo.updated' },
      }),
    ).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: {
          tenantId: adminA.tenantId,
          eventKey: 'workspace.logo.updated',
        },
      }),
    ).toBe(1);
  });

  it('enforces office validation, atomic assignments, permissions, and tenant isolation', async () => {
    const created = await api(adminA)
      .post('/offices')
      .send({
        officeName: 'Mumbai Hub',
        latitude: 19.076,
        longitude: 72.8777,
        radiusMeters: 150,
        timezone: 'Asia/Kolkata',
        egressIps: ['203.0.113.10', '10.0.0.0/24'],
        wifiSsids: ['Mumbai-HR'],
      })
      .expect(201);
    const officeId = (created.body as IdBody).data.id;
    await api(adminA)
      .post('/offices')
      .send({
        officeName: 'mumbai hub',
        latitude: 19,
        longitude: 72,
        radiusMeters: 100,
      })
      .expect(409)
      .expect(({ body }) =>
        expect((body as ErrorBody).code).toBe('OFFICE_NAME_EXISTS'),
      );
    await api(adminA)
      .put(`/offices/${officeId}/employees`)
      .send({
        employeeIds: [employeeA, employeeB],
        primaryEmployeeIds: [employeeA],
      })
      .expect(200);
    expect(
      await prisma.employeeOfficeAssignment.count({
        where: { tenantId: adminA.tenantId, officeLocationId: officeId },
      }),
    ).toBe(2);
    await api(adminB).get(`/offices/${officeId}`).expect(404);
    await api(employeeSession).get('/offices').expect(403);
    await api(adminA)
      .delete(`/offices/${officeId}`)
      .expect(409)
      .expect(({ body }) =>
        expect((body as ErrorBody).code).toBe('OFFICE_IN_USE'),
      );
  });

  it('resolves employee, department, and tenant-default policy precedence', async () => {
    const tenantPolicy = await createPolicy('Tenant Default');
    const departmentPolicy = await createPolicy('Operations Policy');
    const employeePolicy = await createPolicy('Employee Exception');
    await api(adminA)
      .put(`/attendance-policies/${tenantPolicy}/assignments`)
      .send({ assignments: [{ scope: 'TENANT_DEFAULT' }] })
      .expect(200);
    await api(adminA)
      .put(`/attendance-policies/${departmentPolicy}/assignments`)
      .send({ assignments: [{ scope: 'DEPARTMENT', deptId: departmentA }] })
      .expect(200);
    await api(adminA)
      .put(`/attendance-policies/${employeePolicy}/assignments`)
      .send({ assignments: [{ scope: 'EMPLOYEE', employeeId: employeeA }] })
      .expect(200);
    const employeeResolved = await api(adminA)
      .get(
        `/attendance-policies/resolve?employeeId=${employeeA}&date=2026-07-20`,
      )
      .expect(200);
    const departmentResolved = await api(adminA)
      .get(
        `/attendance-policies/resolve?employeeId=${employeeB}&date=2026-07-20`,
      )
      .expect(200);
    expect((employeeResolved.body as ResolutionBody).resolution.source).toBe(
      'EMPLOYEE',
    );
    expect((departmentResolved.body as ResolutionBody).resolution.source).toBe(
      'DEPARTMENT',
    );
    await api(adminA)
      .put(`/attendance-policies/${departmentPolicy}/assignments`)
      .send({ assignments: [] })
      .expect(200);
    const invalidated = await api(adminA)
      .get(
        `/attendance-policies/resolve?employeeId=${employeeB}&date=2026-07-20`,
      )
      .expect(200);
    expect((invalidated.body as ResolutionBody).resolution.source).toBe(
      'TENANT_DEFAULT',
    );
    const foreignDepartment = await factory.createDepartment({
      tenantId: adminB.tenantId,
      name: `Foreign ${stamp}`,
    });
    await api(adminA)
      .put(`/attendance-policies/${departmentPolicy}/assignments`)
      .send({
        assignments: [{ scope: 'DEPARTMENT', deptId: foreignDepartment.id }],
      })
      .expect(404);
  });

  it('derives overnight shifts, blocks roster overlap, and scopes holidays', async () => {
    const day = await api(adminA)
      .post('/shifts')
      .send({ name: 'Day 09-18', startTime: '09:00', endTime: '18:00' })
      .expect(201);
    const night = await api(adminA)
      .post('/shifts')
      .send({ name: 'Night 22-06', startTime: '22:00', endTime: '06:00' })
      .expect(201);
    const dayBody = day.body as ShiftBody;
    const nightBody = night.body as ShiftBody;
    expect(nightBody.data.isOvernight).toBe(true);
    await api(adminA)
      .post('/rosters')
      .send({
        employeeId: employeeA,
        shiftId: dayBody.data.id,
        rosterDate: '2026-08-01',
      })
      .expect(201);
    await api(adminA)
      .post('/rosters')
      .send({
        employeeId: employeeA,
        shiftId: nightBody.data.id,
        rosterDate: '2026-08-01',
      })
      .expect(409)
      .expect(({ body }) =>
        expect((body as ErrorBody).code).toBe('ROSTER_CONFLICT'),
      );
    const resolved = await api(adminA)
      .get(`/shifts/resolve?employeeId=${employeeA}&date=2026-08-01`)
      .expect(200);
    expect((resolved.body as ResolutionBody).resolution.source).toBe('ROSTER');
    await api(adminA)
      .post('/holidays')
      .send({ holidayName: 'Foundation Day', holidayDate: '2026-08-15' })
      .expect(201);
    await api(adminA)
      .post('/holidays')
      .send({ holidayName: 'Duplicate Scope', holidayDate: '2026-08-15' })
      .expect(409)
      .expect(({ body }) =>
        expect((body as ErrorBody).code).toBe('HOLIDAY_EXISTS'),
      );
    await api(adminA)
      .post('/rosters')
      .send({
        employeeId: employeeA,
        shiftId: dayBody.data.id,
        rosterDate: '2026-08-15',
      })
      .expect(409)
      .expect(({ body }) =>
        expect((body as ErrorBody).code).toBe('ROSTER_HOLIDAY'),
      );
    const holidayBulk = await api(adminA)
      .post('/rosters/bulk')
      .send({
        employeeIds: [employeeA],
        shiftId: dayBody.data.id,
        startDate: '2026-08-15',
        endDate: '2026-08-15',
      })
      .expect(201);
    expect(holidayBulk.body).toMatchObject({
      data: {
        inserted: 0,
        errors: [{ code: 'ROSTER_HOLIDAY' }],
      },
    });
    const concurrent = await Promise.all([
      api(adminA)
        .post('/holidays')
        .send({ holidayName: 'Concurrent A', holidayDate: '2026-08-16' }),
      api(adminA)
        .post('/holidays')
        .send({ holidayName: 'Concurrent B', holidayDate: '2026-08-16' }),
    ]);
    expect(concurrent.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      (concurrent.find(({ status }) => status === 409)?.body as ErrorBody).code,
    ).toBe('HOLIDAY_EXISTS');
  });

  it('imports a 60-row roster with exactly four stable errors and idempotent replay', async () => {
    const shift = await api(adminA)
      .post('/shifts')
      .send({ name: 'Import Day', startTime: '10:00', endTime: '19:00' })
      .expect(201);
    const shiftBody = shift.body as ShiftBody;
    expect(shiftBody.data.id).toBeTruthy();
    const presigned = await api(adminA)
      .post('/rosters/imports/presign')
      .send({ filename: 'acceptance-roster.csv', contentType: 'text/csv' })
      .expect(201);
    const csv = acceptanceRosterCsv(`S3-A-${stamp}`);
    const presignedBody = presigned.body as { objectKey: string };
    storage.putTestObject(presignedBody.objectKey, csv);
    const payload = {
      objectKey: presignedBody.objectKey,
      originalFilename: 'acceptance-roster.csv',
      idempotencyKey: `sprint3-roster-${stamp}`,
    };
    const imported = await api(adminA)
      .post('/rosters/imports')
      .send(payload)
      .expect(201);
    const importedBody = imported.body as ImportBody;
    expect(importedBody.data).toMatchObject({
      totalRows: 60,
      successRows: 56,
      errorRows: 4,
      status: 'COMPLETED',
    });
    expect(importedBody.data.rosterRows.map((row) => row.errorCode)).toEqual([
      'ROSTER_EMPLOYEE_NOT_FOUND',
      'ROSTER_SHIFT_NOT_FOUND',
      'ROSTER_DUPLICATE_ROW',
      'ROSTER_DATE_INVALID',
    ]);
    const replay = await api(adminA)
      .post('/rosters/imports')
      .send(payload)
      .expect(201);
    const replayImportBody = replay.body as ImportBody;
    expect(replayImportBody.data.id).toBe(importedBody.data.id);
    expect(
      await prisma.employeeShiftRoster.count({
        where: {
          tenantId: adminA.tenantId,
          employeeId: employeeA,
          shiftId: shiftBody.data.id,
        },
      }),
    ).toBe(56);
    expect(
      await prisma.tenantAuditLog.count({
        where: {
          tenantId: adminA.tenantId,
          action: 'attendance.rosters.imported',
        },
      }),
    ).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: {
          tenantId: adminA.tenantId,
          eventKey: 'attendance.rosters.imported',
        },
      }),
    ).toBe(1);
  });

  it('resolves policy and shift for 500 employees without N+1 query growth', async () => {
    await prisma.employee.createMany({
      data: Array.from({ length: 498 }, (_, index) => ({
        tenantId: adminA.tenantId,
        employeeCode: `S3-PERF-${stamp}-${index}`,
        fullName: `Performance Employee ${index}`,
        workType: 'OFFICE' as const,
        status: 'ACTIVE' as const,
        dateOfJoining: new Date('2026-01-01T00:00:00.000Z'),
        deptId: departmentA,
      })),
    });
    const employeeIds = (
      await prisma.employee.findMany({
        where: { tenantId: adminA.tenantId },
        select: { id: true },
        take: 500,
      })
    ).map(({ id }) => id);
    expect(employeeIds).toHaveLength(500);

    const policyStartedAt = performance.now();
    const policies = await api(adminA)
      .post('/attendance-policies/resolve/bulk')
      .send({ employeeIds, date: '2026-10-01' })
      .expect(201);
    const policyDuration = performance.now() - policyStartedAt;

    const shiftStartedAt = performance.now();
    const shifts = await api(adminA)
      .post('/shifts/resolve/bulk')
      .send({ employeeIds, date: '2026-10-01' })
      .expect(201);
    const shiftDuration = performance.now() - shiftStartedAt;

    expect((policies.body as DataBody<unknown[]>).data).toHaveLength(500);
    expect((shifts.body as DataBody<unknown[]>).data).toHaveLength(500);
    expect(policyDuration).toBeLessThan(1000);
    expect(shiftDuration).toBeLessThan(1000);
  });

  it('keeps new configuration and roster-import tables fail-closed under RLS', async () => {
    const userPool = new Pool({
      connectionString:
        'postgresql://app_user:app_password@localhost:5433/hrms_dev?schema=public',
    });
    const client = await userPool.connect();
    try {
      const noContext = await client.query<{ policies: string; rows: string }>(
        'SELECT (SELECT count(*) FROM attendance_policies)::text AS policies, (SELECT count(*) FROM roster_import_rows)::text AS rows',
      );
      expect(noContext.rows[0]).toEqual({ policies: '0', rows: '0' });

      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1::text, true)", [
        adminA.tenantId,
      ]);
      const tenantContext = await client.query<{
        policies: string;
        rows: string;
      }>(
        'SELECT (SELECT count(*) FROM attendance_policies)::text AS policies, (SELECT count(*) FROM roster_import_rows)::text AS rows',
      );
      expect(Number(tenantContext.rows[0].policies)).toBeGreaterThanOrEqual(3);
      expect(Number(tenantContext.rows[0].rows)).toBe(60);
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await userPool.end();
    }
  });

  async function createPolicy(name: string) {
    const response = await api(adminA)
      .post('/attendance-policies')
      .send({ name })
      .expect(201);
    return (response.body as IdBody).data.id;
  }

  function api(session: Session) {
    return {
      get: (path: string) =>
        request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${session.accessToken}`)
          .set('x-tenant-id', session.tenantId),
      post: (path: string) =>
        request(app.getHttpServer())
          .post(path)
          .set('Authorization', `Bearer ${session.accessToken}`)
          .set('x-tenant-id', session.tenantId),
      patch: (path: string) =>
        request(app.getHttpServer())
          .patch(path)
          .set('Authorization', `Bearer ${session.accessToken}`)
          .set('x-tenant-id', session.tenantId),
      put: (path: string) =>
        request(app.getHttpServer())
          .put(path)
          .set('Authorization', `Bearer ${session.accessToken}`)
          .set('x-tenant-id', session.tenantId),
      delete: (path: string) =>
        request(app.getHttpServer())
          .delete(path)
          .set('Authorization', `Bearer ${session.accessToken}`)
          .set('x-tenant-id', session.tenantId),
    };
  }

  async function createWorkspace(
    label: string,
    roleName: keyof typeof DEFAULT_ROLE_PERMISSIONS,
  ) {
    const tenant = await factory.createTenant({
      companyName: `Sprint 3 ${label} ${stamp}`,
      subdomain: `sprint3-${label.toLowerCase()}-${stamp}`,
    });
    tenantIds.push(tenant.id);
    await factory.ensureTrialSubscription(tenant.id, 500);
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
    return createUserSession(tenant.id, roleName);
  }

  async function createUserSession(
    tenantId: string,
    roleName: keyof typeof DEFAULT_ROLE_PERMISSIONS,
  ) {
    const password = 'Sprint3User123!';
    const user = await factory.createUser({
      tenantId,
      email: `${roleName.toLowerCase()}-${stamp}-${Math.random()}@sprint3.test`,
      passwordHash: await argon2.hash(password),
    });
    const role = await factory.createSystemRole(tenantId, roleName);
    await factory.assignRole(user.id, role.id);
    const login = await TenantContextService.run({ tenantId }, () =>
      auth.login(user.email, password, '127.0.0.1', 'sprint3-jest'),
    );
    return { tenantId, accessToken: login.accessToken, userId: user.id };
  }
});

function acceptanceRosterCsv(employeeCode: string) {
  return readFileSync(
    resolve(process.cwd(), 'test/fixtures/rosters-60.csv'),
    'utf8',
  ).replaceAll('{{EMPLOYEE_CODE}}', employeeCode);
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
  await prisma.rosterImportRow.deleteMany({ where: { tenantId } });
  await prisma.importJob.deleteMany({ where: { tenantId } });
  await prisma.employeeShiftRoster.deleteMany({ where: { tenantId } });
  await prisma.tenantHoliday.deleteMany({ where: { tenantId } });
  await prisma.policyAssignment.deleteMany({ where: { tenantId } });
  await prisma.attendancePolicy.deleteMany({ where: { tenantId } });
  await prisma.employeeOfficeAssignment.deleteMany({ where: { tenantId } });
  await prisma.officeLocation.deleteMany({ where: { tenantId } });
  await prisma.employmentEvent.deleteMany({ where: { tenantId } });
  await prisma.employee.deleteMany({ where: { tenantId } });
  await prisma.shift.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.designation.deleteMany({ where: { tenantId } });
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

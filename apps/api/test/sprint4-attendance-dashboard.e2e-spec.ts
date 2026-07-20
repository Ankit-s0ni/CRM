import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { AttendanceStatus, PrismaClient, WorkType } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/platform/identity/auth.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/shared/authorization/permissions.constants';
import { TenantContextService } from '../src/platform/tenancy/public';
import { TestDataFactory } from './support/factories';

type Session = { tenantId: string; accessToken: string; userId: string };
type DashboardBody = {
  data: {
    summary: {
      present: number;
      late: number;
      absent: number;
      onField: number;
      onBreak: number;
      notYetIn: number;
    };
    employees: Array<{ fullName: string; status: string }>;
  };
};

describe('Sprint 4 attendance dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let factory: TestDataFactory;
  let auth: AuthService;
  const tenantIds: string[] = [];
  const stamp = Date.now();
  const dashboardDate = new Date('2026-07-17T00:00:00.000Z');
  let businessAdmin: Session;
  let hrAdmin: Session;
  let employeeSession: Session;
  let scopedOfficeId: string;
  let foreignOfficeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    auth = moduleFixture.get(AuthService);
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    factory = new TestDataFactory(prisma);

    const tenantA = await createTenant('A');
    const tenantB = await createTenant('B');
    businessAdmin = await createUserSession(tenantA, 'BUSINESS_ADMIN');
    hrAdmin = await createUserSession(tenantA, 'HR_ADMIN');
    employeeSession = await createUserSession(tenantA, 'EMPLOYEE');
    scopedOfficeId = await createAttendanceFixture(tenantA, false);
    foreignOfficeId = await createAttendanceFixture(tenantB, true);
  });

  afterAll(async () => {
    for (const tenantId of tenantIds) await cleanupTenant(prisma, tenantId);
    await app.close();
    await prisma.$disconnect();
    await pool.end();
  });

  it.each([
    ['Business Admin', () => businessAdmin],
    ['HR Admin', () => hrAdmin],
  ])('returns the shared tenant live board for %s', async (_label, session) => {
    const response = await api(session())
      .get('/attendance/dashboard?date=2026-07-17')
      .expect(200);
    const body = response.body as DashboardBody;

    expect(body.data.summary).toEqual({
      present: 2,
      late: 1,
      absent: 1,
      onField: 1,
      onBreak: 0,
      notYetIn: 1,
    });
    expect(body.data.employees.map(({ fullName }) => fullName)).toEqual([
      'Aisha Dashboard',
      'Fatima Dashboard',
      'Omar Dashboard',
      'Zayed Dashboard',
    ]);
    expect(body.data.employees).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fullName: 'Foreign Dashboard Employee' }),
      ]),
    );
  });

  it('denies employees without organization-wide attendance access', async () => {
    await api(employeeSession)
      .get('/attendance/dashboard?date=2026-07-17')
      .expect(403);
  });

  it('scopes dashboard employees and aggregates by office without tenant leakage', async () => {
    const scoped = await api(businessAdmin)
      .get(`/attendance/dashboard?date=2026-07-17&officeId=${scopedOfficeId}`)
      .expect(200);
    const scopedBody = scoped.body as DashboardBody;

    expect(scopedBody.data.summary).toEqual({
      present: 1,
      late: 0,
      absent: 0,
      onField: 0,
      onBreak: 0,
      notYetIn: 0,
    });
    expect(scopedBody.data.employees.map(({ fullName }) => fullName)).toEqual([
      'Aisha Dashboard',
    ]);

    const foreign = await api(businessAdmin)
      .get(`/attendance/dashboard?date=2026-07-17&officeId=${foreignOfficeId}`)
      .expect(200);
    const foreignBody = foreign.body as DashboardBody;
    expect(foreignBody.data.employees).toEqual([]);
    expect(foreignBody.data.summary).toEqual({
      present: 0,
      late: 0,
      absent: 0,
      onField: 0,
      onBreak: 0,
      notYetIn: 0,
    });
  });

  it('rejects invalid calendar dates', async () => {
    await api(businessAdmin)
      .get('/attendance/dashboard?date=2026-02-31')
      .expect(400);
  });

  function api(session: Session) {
    return {
      get: (path: string) =>
        request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${session.accessToken}`)
          .set('x-tenant-id', session.tenantId),
    };
  }

  async function createTenant(label: string) {
    const tenant = await factory.createTenant({
      companyName: `Sprint 4 Dashboard ${label} ${stamp}`,
      subdomain: `sprint4-dashboard-${label.toLowerCase()}-${stamp}`,
    });
    tenantIds.push(tenant.id);
    await factory.ensureTrialSubscription(tenant.id, 100);
    return tenant.id;
  }

  async function createUserSession(
    tenantId: string,
    roleName: keyof typeof DEFAULT_ROLE_PERMISSIONS,
  ) {
    const password = 'Sprint4User123!';
    const user = await factory.createUser({
      tenantId,
      email: `${roleName.toLowerCase()}-${stamp}-${Math.random()}@sprint4.test`,
      passwordHash: await argon2.hash(password),
    });
    const role = await factory.createSystemRole(tenantId, roleName);
    await factory.assignRole(user.id, role.id);
    const login = await TenantContextService.run({ tenantId }, () =>
      auth.login(user.email, password, '127.0.0.1', 'sprint4-jest'),
    );
    return { tenantId, accessToken: login.accessToken, userId: user.id };
  }

  async function createAttendanceFixture(tenantId: string, foreign: boolean) {
    const department = await factory.createDepartment({
      tenantId,
      name: foreign ? 'Foreign Operations' : 'Operations',
    });
    const employees = foreign
      ? [
          await factory.createEmployee({
            tenantId,
            deptId: department.id,
            fullName: 'Foreign Dashboard Employee',
            employeeCode: `S4-FOREIGN-${stamp}`,
          }),
        ]
      : await Promise.all([
          factory.createEmployee({
            tenantId,
            deptId: department.id,
            fullName: 'Aisha Dashboard',
            employeeCode: `S4-A-${stamp}`,
          }),
          factory.createEmployee({
            tenantId,
            deptId: department.id,
            fullName: 'Fatima Dashboard',
            employeeCode: `S4-B-${stamp}`,
            workType: WorkType.FIELD,
          }),
          factory.createEmployee({
            tenantId,
            deptId: department.id,
            fullName: 'Omar Dashboard',
            employeeCode: `S4-C-${stamp}`,
          }),
          factory.createEmployee({
            tenantId,
            deptId: department.id,
            fullName: 'Zayed Dashboard',
            employeeCode: `S4-D-${stamp}`,
          }),
        ]);

    const logs = foreign
      ? [{ employee: employees[0], status: AttendanceStatus.PRESENT, late: 0 }]
      : [
          { employee: employees[0], status: AttendanceStatus.PRESENT, late: 0 },
          {
            employee: employees[1],
            status: AttendanceStatus.PRESENT,
            late: 12,
          },
          { employee: employees[2], status: AttendanceStatus.ABSENT, late: 0 },
        ];
    await prisma.attendanceLog.createMany({
      data: logs.map(({ employee, status, late }) => ({
        tenantId,
        employeeId: employee.id,
        attendanceDate: dashboardDate,
        attendanceStatus: status,
        lateMinutes: late,
        firstCheckin:
          status === AttendanceStatus.ABSENT
            ? null
            : new Date('2026-07-17T05:00:00.000Z'),
      })),
    });

    const office = await prisma.officeLocation.create({
      data: {
        tenantId,
        officeName: `${foreign ? 'Foreign' : 'Scoped'} Dashboard Office ${stamp}`,
        latitude: foreign ? 24.4539 : 23.588,
        longitude: foreign ? 54.3773 : 58.3829,
        radiusMeters: 150,
      },
    });
    await prisma.employeeOfficeAssignment.create({
      data: {
        tenantId,
        employeeId: employees[0].id,
        officeLocationId: office.id,
        isPrimary: true,
      },
    });
    return office.id;
  }
});

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
  await prisma.regularizationRequest.deleteMany({ where: { tenantId } });
  await prisma.securityAlert.deleteMany({ where: { tenantId } });
  await prisma.attendanceLog.deleteMany({ where: { tenantId } });
  await prisma.employeeOfficeAssignment.deleteMany({ where: { tenantId } });
  await prisma.officeLocation.deleteMany({ where: { tenantId } });
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
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

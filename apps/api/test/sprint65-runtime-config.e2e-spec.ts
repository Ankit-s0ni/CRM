import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/platform/identity/auth.service';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
} from '../src/shared/authorization/permissions.constants';
import { TenantContextService } from '../src/platform/tenancy/public';
import { TestDataFactory } from './support/factories';

type Session = { tenantId: string; accessToken: string };

describe('Sprint 6.5 dynamic tenant runtime (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let factory: TestDataFactory;
  let auth: AuthService;
  let tenantA = '';
  let tenantB = '';
  let employeeId = '';
  let policyId = '';
  let deviceUuid = '';
  let employee: Session;
  let adminA: Session;
  let adminB: Session;
  let managerA: Session;
  const stamp = Date.now();

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.FIELD_QUEUE_MODE = 'inline';
    process.env.FIELD_REDIS_MODE = 'disabled';
    const moduleFixture = await Test.createTestingModule({
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
    await prisma.permission.createMany({
      data: Object.values(PERMISSIONS).map((key) => ({ key })),
      skipDuplicates: true,
    });

    const a = await factory.createTenant({
      companyName: `Dubai Office ${stamp}`,
      subdomain: `s65-a-${stamp}`,
    });
    const b = await factory.createTenant({
      companyName: `Locked Tenant ${stamp}`,
      subdomain: `s65-b-${stamp}`,
    });
    tenantA = a.id;
    tenantB = b.id;
    await Promise.all([
      factory.ensureTrialSubscription(tenantA),
      factory.ensureTrialSubscription(tenantB),
    ]);
    await enableModule(tenantA, 'ATTENDANCE');
    await enableModule(tenantA, 'FIELD_TRACKING');
    await enableModule(tenantB, 'ATTENDANCE');

    adminA = await createSession(tenantA, 'BUSINESS_ADMIN', 'admin-a');
    adminB = await createSession(tenantB, 'BUSINESS_ADMIN', 'admin-b');
    managerA = await createSession(tenantA, 'MANAGER', 'manager-a');
    const department = await factory.createDepartment({
      tenantId: tenantA,
      name: `Operations ${stamp}`,
    });
    const user = await createUser(tenantA, 'employee-a', 'EMPLOYEE');
    employeeId = (
      await factory.createEmployee({
        tenantId: tenantA,
        deptId: department.id,
        userId: user.id,
        employeeCode: `S65-${stamp}`,
        fullName: 'Aisha Runtime Employee',
        workType: 'OFFICE',
      })
    ).id;
    const office = await prisma.officeLocation.create({
      data: {
        tenantId: tenantA,
        officeName: 'Dubai Office',
        latitude: 25.2048,
        longitude: 55.2708,
        radiusMeters: 200,
      },
    });
    await prisma.employeeOfficeAssignment.create({
      data: {
        tenantId: tenantA,
        employeeId,
        officeLocationId: office.id,
        isPrimary: true,
      },
    });
    const policy = await prisma.attendancePolicy.create({
      data: {
        tenantId: tenantA,
        name: 'Location only',
        locationMode: 'OFFICE_GEOFENCE',
        selfieMode: 'DISABLED',
        requireGeofence: true,
        requireFaceMatch: false,
        requireRegisteredDevice: true,
      },
    });
    policyId = policy.id;
    await prisma.policyAssignment.create({
      data: {
        tenantId: tenantA,
        policyId,
        scope: 'TENANT_DEFAULT',
      },
    });
    deviceUuid = randomUUID();
    await prisma.registeredDevice.create({
      data: {
        tenantId: tenantA,
        employeeId,
        deviceUuid,
        platform: 'ANDROID',
        status: 'ACTIVE',
        isPrimary: true,
      },
    });
    employee = await login(tenantA, user.email, 'Sprint65User123!', deviceUuid);
  });

  afterAll(async () => {
    for (const tenantId of [tenantA, tenantB]) await cleanupTenant(tenantId);
    await app.close();
    await prisma.$disconnect();
    await pool.end();
    delete process.env.FIELD_QUEUE_MODE;
    delete process.env.FIELD_REDIS_MODE;
  });

  it('returns a minimal location-only bootstrap with ETag revalidation', async () => {
    const response = await api(employee)
      .get('/mobile/runtime-config')
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(response.headers.etag).toBeTruthy();
    expect(response.body).toMatchObject({
      data: {
        product: { name: 'DeltCRM' },
        tenant: { id: tenantA, name: `Dubai Office ${stamp}` },
        attendance: {
          canPunch: true,
          locationMode: 'OFFICE_GEOFENCE',
          selfieMode: 'DISABLED',
        },
        fieldTracking: { enabled: false },
        onboarding: {
          deviceRegistrationComplete: true,
          biometricConsentRequired: false,
          faceEnrollmentRequired: false,
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('faceEmbeddingRef');
    expect(JSON.stringify(response.body)).not.toContain('egressIps');
    await api(employee)
      .get('/mobile/runtime-config')
      .set('If-None-Match', response.headers.etag)
      .expect(304);
  });

  it('rejects a token/header tenant mismatch without leaking tenant branding', async () => {
    const response = await request(app.getHttpServer())
      .get('/mobile/runtime-config')
      .set('Authorization', `Bearer ${employee.accessToken}`)
      .set('x-tenant-id', tenantB)
      .expect(403);
    expect(JSON.stringify(response.body)).not.toContain(
      `Locked Tenant ${stamp}`,
    );
  });

  it('enforces entitlement and safely terminates field tracking when disabled', async () => {
    await api(managerA)
      .get('/workspace/attendance-capabilities')
      .expect(200)
      .expect(({ body }) =>
        expect(
          (body as { data: { fieldTrackingRelevant: boolean } }).data
            .fieldTrackingRelevant,
        ).toBe(false),
      );
    await api(adminB)
      .patch('/workspace/attendance-capabilities')
      .send({ fieldTrackingEnabled: true })
      .expect(403)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('MODULE_ACCESS_DENIED'),
      );

    await api(adminA)
      .patch('/workspace/attendance-capabilities')
      .send({ fieldTrackingEnabled: true, fieldTrackingIntervalMin: 10 })
      .expect(200);
    await prisma.attendancePolicy.update({
      where: { id: policyId },
      data: { locationMode: 'FIELD_GPS', fieldTrackingEnabled: true },
    });
    await prisma.employee.update({
      where: { id: employeeId },
      data: { workType: 'FIELD' },
    });
    await api(managerA)
      .get('/workspace/attendance-capabilities')
      .expect(200)
      .expect(({ body }) =>
        expect(
          (body as { data: { fieldTrackingRelevant: boolean } }).data
            .fieldTrackingRelevant,
        ).toBe(true),
      );
    await api(employee)
      .get('/mobile/runtime-config')
      .expect(200)
      .expect(({ body }) => {
        expect(
          (body as { data: { fieldTracking: unknown } }).data.fieldTracking,
        ).toEqual({ enabled: true, intervalMinutes: 10 });
      });
    await api(employee)
      .post('/field-sessions/start')
      .send({ deviceUuid, clientStartUuid: randomUUID() })
      .expect(201);
    await api(adminA)
      .patch('/workspace/attendance-capabilities')
      .send({ fieldTrackingEnabled: false })
      .expect(200);
    expect(
      await prisma.fieldTrackingSession.count({
        where: { tenantId: tenantA, employeeId, endedAt: null },
      }),
    ).toBe(0);
    await api(employee)
      .post('/field-sessions/start')
      .send({ deviceUuid, clientStartUuid: randomUUID() })
      .expect(403)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('CAPABILITY_NOT_ENABLED'),
      );
  });

  it('denies bootstrap after the employee becomes inactive', async () => {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { status: 'TERMINATED' },
    });
    await api(employee)
      .get('/mobile/runtime-config')
      .expect(403)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('EMPLOYEE_NOT_ACTIVE'),
      );
  });

  it('denies a suspended workspace before returning tenant runtime data', async () => {
    await prisma.tenant.update({
      where: { id: tenantA },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedReason: 'Sprint 6.5 acceptance fixture',
      },
    });
    const response = await api(employee)
      .get('/mobile/runtime-config')
      .expect(403);
    expect((response.body as { code: string }).code).toBe('TENANT_SUSPENDED');
    expect(JSON.stringify(response.body)).not.toContain(
      `Dubai Office ${stamp}`,
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
    };
  }

  async function enableModule(tenantId: string, key: string) {
    const module = await prisma.module.upsert({
      where: { key },
      update: { availability: 'AVAILABLE' },
      create: {
        key,
        name: key.replaceAll('_', ' '),
        availability: 'AVAILABLE',
      },
    });
    await prisma.tenantModule.create({
      data: {
        tenantId,
        moduleId: module.id,
        isActive: true,
        activatedAt: new Date(),
      },
    });
    if (key === 'FIELD_TRACKING') {
      const capability = await prisma.moduleCapability.findUniqueOrThrow({
        where: { key: 'ATTENDANCE_FIELD_TRACKING' },
      });
      await prisma.tenantCapabilityOverride.upsert({
        where: {
          tenantId_capabilityId: { tenantId, capabilityId: capability.id },
        },
        update: { mode: 'ENABLE', reason: 'Sprint 6.5 test entitlement' },
        create: {
          tenantId,
          capabilityId: capability.id,
          mode: 'ENABLE',
          reason: 'Sprint 6.5 test entitlement',
          changedBy: randomUUID(),
        },
      });
    }
  }

  async function createUser(
    tenantId: string,
    suffix: string,
    roleName: keyof typeof DEFAULT_ROLE_PERMISSIONS,
  ) {
    const user = await factory.createUser({
      tenantId,
      email: `${suffix}-${stamp}@sprint65.test`,
      passwordHash: await argon2.hash('Sprint65User123!'),
    });
    const role = await factory.createSystemRole(tenantId, roleName);
    await factory.assignRole(user.id, role.id);
    return user;
  }

  async function createSession(
    tenantId: string,
    roleName: keyof typeof DEFAULT_ROLE_PERMISSIONS,
    suffix: string,
  ) {
    const user = await createUser(tenantId, suffix, roleName);
    return login(tenantId, user.email, 'Sprint65User123!');
  }

  async function login(
    tenantId: string,
    email: string,
    password: string,
    device?: string,
  ): Promise<Session> {
    const session = await TenantContextService.run({ tenantId }, () =>
      auth.login(email, password, '127.0.0.1', 'sprint65-jest', device),
    );
    return { tenantId, accessToken: session.accessToken };
  }

  async function cleanupTenant(tenantId: string) {
    if (!tenantId) return;
    await prisma.fieldLocationPing.deleteMany({ where: { tenantId } });
    await prisma.fieldTrackingSession.deleteMany({ where: { tenantId } });
    await prisma.registeredDevice.deleteMany({ where: { tenantId } });
    await prisma.employeeOfficeAssignment.deleteMany({ where: { tenantId } });
    await prisma.policyAssignment.deleteMany({ where: { tenantId } });
    await prisma.attendancePolicy.deleteMany({ where: { tenantId } });
    await prisma.officeLocation.deleteMany({ where: { tenantId } });
    await prisma.tenantAuditLog.deleteMany({ where: { tenantId } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId } });
    await prisma.employee.deleteMany({ where: { tenantId } });
    await prisma.department.deleteMany({ where: { tenantId } });
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const roles = await prisma.role.findMany({
      where: { tenantId },
      select: { id: true },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: users.map(({ id }) => id) } },
    });
    await prisma.loginAttempt.deleteMany({ where: { tenantId } });
    await prisma.userRole.deleteMany({
      where: { userId: { in: users.map(({ id }) => id) } },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: { in: roles.map(({ id }) => id) } },
    });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.role.deleteMany({ where: { tenantId } });
    await prisma.tenantCapabilityOverride.deleteMany({ where: { tenantId } });
    await prisma.tenantModule.deleteMany({ where: { tenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.tenantSettings.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  }
});

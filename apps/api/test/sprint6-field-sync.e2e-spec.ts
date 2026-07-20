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
import { AuthService } from '../src/modules/identity/auth.service';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
} from '../src/shared/authorization/permissions.constants';
import { TenantContextService } from '../src/shared/tenancy/tenant-context.service';
import { TestDataFactory } from './support/factories';

type Session = { tenantId: string; userId: string; accessToken: string };

describe('Sprint 6 field tracking and offline sync (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let factory: TestDataFactory;
  let auth: AuthService;
  let tenantId = '';
  let employeeId = '';
  let deviceUuid = '';
  let employee: Session;
  let admin: Session;
  const stamp = Date.now();

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.FIELD_QUEUE_MODE = 'inline';
    process.env.FIELD_REDIS_MODE = 'disabled';
    process.env.ATTENDANCE_QUEUE_MODE = 'disabled';
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
    const tenant = await factory.createTenant({
      companyName: `Sprint 6 Field ${stamp}`,
      subdomain: `sprint6-field-${stamp}`,
    });
    tenantId = tenant.id;
    await factory.ensureTrialSubscription(tenantId);
    for (const key of ['ATTENDANCE', 'FIELD_TRACKING']) {
      const module = await prisma.module.upsert({
        where: { key },
        update: { availability: 'AVAILABLE' },
        create: { key, name: key.replace('_', ' '), availability: 'AVAILABLE' },
      });
      await prisma.tenantModule.create({
        data: {
          tenantId,
          moduleId: module.id,
          isActive: true,
          activatedAt: new Date(),
        },
      });
    }
    employee = await createSession('EMPLOYEE');
    admin = await createSession('BUSINESS_ADMIN');
    const department = await factory.createDepartment({
      tenantId,
      name: `Field ${stamp}`,
    });
    employeeId = (
      await factory.createEmployee({
        tenantId,
        deptId: department.id,
        userId: employee.userId,
        employeeCode: `S6-${stamp}`,
        fullName: 'Noura Field Test',
        workType: 'FIELD',
      })
    ).id;
    await prisma.tenantSettings.update({
      where: { tenantId },
      data: { fieldTrackingEnabled: true },
    });
    const fieldPolicy = await prisma.attendancePolicy.create({
      data: {
        tenantId,
        name: 'Sprint 6 field policy',
        locationMode: 'FIELD_GPS',
        selfieMode: 'DISABLED',
        requireGeofence: true,
        requireFaceMatch: false,
        fieldTrackingEnabled: true,
        allowHybridFieldTracking: false,
      },
    });
    await prisma.policyAssignment.create({
      data: { tenantId, policyId: fieldPolicy.id, scope: 'TENANT_DEFAULT' },
    });
    deviceUuid = randomUUID();
    await prisma.registeredDevice.create({
      data: {
        tenantId,
        employeeId,
        deviceUuid,
        platform: 'ANDROID',
        status: 'ACTIVE',
        isPrimary: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.fieldLocationPing.deleteMany({ where: { tenantId } });
    await prisma.fieldPingReceipt.deleteMany({ where: { tenantId } });
    await prisma.fieldRouteSummary.deleteMany({ where: { tenantId } });
    await prisma.fieldTrackingSession.deleteMany({ where: { tenantId } });
    await prisma.attendanceSyncReceipt.deleteMany({ where: { tenantId } });
    await prisma.attendanceEvent.deleteMany({ where: { tenantId } });
    await prisma.attendanceVerificationLog.deleteMany({ where: { tenantId } });
    await prisma.attendanceLog.deleteMany({ where: { tenantId } });
    await prisma.deviceIntegrityChallenge.deleteMany({ where: { tenantId } });
    await prisma.registeredDevice.deleteMany({ where: { tenantId } });
    await prisma.policyAssignment.deleteMany({ where: { tenantId } });
    await prisma.attendancePolicy.deleteMany({ where: { tenantId } });
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
    await prisma.tenantModule.deleteMany({ where: { tenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.tenantSettings.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
    await prisma.$disconnect();
    await pool.end();
    delete process.env.FIELD_QUEUE_MODE;
    delete process.env.FIELD_REDIS_MODE;
  });

  it('issues a one-time integrity challenge bound to the active employee device', async () => {
    const response = await api(employee)
      .post('/attendance/integrity/challenges')
      .send({ deviceUuid, action: 'OFFLINE_PUNCH' })
      .expect(201);
    const challenge = (
      response.body as {
        data: {
          id: string;
          nonce: string;
          platform: string;
          expiresAt: string;
        };
      }
    ).data;

    expect(challenge.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge.platform).toBe('ANDROID');
    const stored = await prisma.deviceIntegrityChallenge.findUniqueOrThrow({
      where: { id: challenge.id },
    });
    expect(stored).toMatchObject({
      tenantId,
      employeeId,
      action: 'OFFLINE_PUNCH',
      consumedAt: null,
    });
    expect(stored.nonceHash).not.toBe(challenge.nonce);

    await api(admin)
      .post('/attendance/integrity/challenges')
      .send({ deviceUuid, action: 'PUNCH' })
      .expect(403);
  });

  it('starts idempotently, ingests deduplicated pings, and serves live and route reads', async () => {
    const clientStartUuid = randomUUID();
    const started = await api(employee)
      .post('/field-sessions/start')
      .send({ deviceUuid, clientStartUuid })
      .expect(201);
    const sessionId = (started.body as { data: { id: string } }).data.id;
    await api(employee)
      .post('/field-sessions/start')
      .send({ deviceUuid, clientStartUuid })
      .expect(201)
      .expect(({ body }) =>
        expect((body as { duplicate: boolean }).duplicate).toBe(true),
      );
    await api(employee)
      .post('/field-sessions/start')
      .send({ deviceUuid, clientStartUuid: randomUUID() })
      .expect(409);

    const now = new Date();
    const items = Array.from({ length: 5 }, (_, index) => ({
      clientPingUuid: randomUUID(),
      sessionId,
      latitude: 23.588 + index * 0.0002,
      longitude: 58.382 + index * 0.0002,
      accuracyM: 8,
      speedMps: 3,
      batteryLevel: 80 - index,
      capturedAt: now.toISOString(),
      isOfflineSync: index < 3,
    }));
    await api(employee)
      .post('/field-pings/batch')
      .send({ deviceUuid, items })
      .expect(201)
      .expect(({ body }) => {
        expect(
          (body as { data: Array<{ status: string }> }).data.every(
            ({ status }) => status === 'ACCEPTED',
          ),
        ).toBe(true);
      });
    await api(employee)
      .post('/field-pings/batch')
      .send({ deviceUuid, items })
      .expect(201)
      .expect(({ body }) => {
        expect(
          (body as { data: Array<{ status: string }> }).data.every(
            ({ status }) => status === 'DUPLICATE',
          ),
        ).toBe(true);
      });
    expect(
      await prisma.fieldLocationPing.count({ where: { tenantId, sessionId } }),
    ).toBe(5);
    expect(
      await prisma.fieldPingReceipt.count({ where: { tenantId, sessionId } }),
    ).toBe(5);

    await api(admin)
      .get('/field/employees/live')
      .expect(200)
      .expect(({ body }) => {
        const rows = (body as { data: Array<{ id: string; presence: string }> })
          .data;
        expect(rows).toContainEqual(
          expect.objectContaining({ id: employeeId, presence: 'LIVE' }),
        );
      });
    const date = dateInTimeZone(now, 'Asia/Kolkata');
    await api(admin)
      .get(`/field/employees/${employeeId}/routes/${date}`)
      .expect(200)
      .expect(({ body }) => {
        const route = (
          body as { data: { pingCount: number; trackingGapMinutes: number } }
        ).data;
        expect(route.pingCount).toBe(5);
        expect(route.trackingGapMinutes).toBe(0);
      });
  });

  it('replays an ordered offline day exactly once and auto-stops tracking on checkout', async () => {
    const base = completedTenantDayBase();
    const items = ['CHECKIN', 'BREAK_START', 'BREAK_END', 'CHECKOUT'].map(
      (type, index) => {
        const clientTime = new Date(base.getTime() + index * 3 * 60_000);
        return {
          clientEventUuid: randomUUID(),
          type,
          deviceUuid,
          attestationToken: 'offline-integrity-valid',
          integrityIssuedAt: new Date(
            clientTime.getTime() - 60_000,
          ).toISOString(),
          integrityExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
          clientTime: clientTime.toISOString(),
          clientClockOffsetSeconds: 20,
          latitude: 23.588,
          longitude: 58.382,
          accuracyMeters: 8,
        };
      },
    );
    await api(employee)
      .post('/attendance/sync')
      .send({ items })
      .expect(201)
      .expect(({ body }) => {
        expect(
          (body as { data: Array<{ status: string }> }).data.map(
            ({ status }) => status,
          ),
        ).toEqual(['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED']);
      });
    await api(employee)
      .post('/attendance/sync')
      .send({ items })
      .expect(201)
      .expect(({ body }) => {
        expect(
          (body as { data: Array<{ status: string }> }).data.every(
            ({ status }) => status === 'DUPLICATE',
          ),
        ).toBe(true);
      });
    expect(
      await prisma.attendanceEvent.count({ where: { tenantId, employeeId } }),
    ).toBe(4);
    expect(
      await prisma.attendanceSyncReceipt.count({
        where: { tenantId, employeeId },
      }),
    ).toBe(4);
    expect(
      await prisma.fieldTrackingSession.count({
        where: { tenantId, employeeId, endedAt: null },
      }),
    ).toBe(0);
    const stored = await prisma.attendanceEvent.findMany({
      where: { tenantId, employeeId },
      orderBy: { eventTime: 'asc' },
    });
    expect(stored.every(({ isOfflineSync }) => isOfflineSync)).toBe(true);
  });

  it('returns permanent coded outcomes for expired evidence and clock tamper', async () => {
    const base = {
      clientEventUuid: randomUUID(),
      type: 'CHECKIN',
      deviceUuid,
      attestationToken: 'offline-integrity-valid',
      integrityIssuedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
      integrityExpiresAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
      clientTime: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
      clientClockOffsetSeconds: 0,
      latitude: 23.588,
      longitude: 58.382,
      accuracyMeters: 8,
    };
    await api(employee)
      .post('/attendance/sync')
      .send({
        items: [
          base,
          {
            ...base,
            clientEventUuid: randomUUID(),
            integrityExpiresAt: new Date(Date.now() + 60_000).toISOString(),
            clientClockOffsetSeconds: 600,
          },
        ],
      })
      .expect(201)
      .expect(({ body }) => {
        expect(
          (body as { data: Array<{ status: string; code: string }> }).data,
        ).toEqual([
          expect.objectContaining({
            status: 'REJECTED',
            code: 'OFFLINE_INTEGRITY_EXPIRED',
          }),
          expect.objectContaining({ status: 'REJECTED', code: 'CLOCK_TAMPER' }),
        ]);
      });
  });

  it('keeps field and sync evidence fail-closed without tenant context', async () => {
    const userPool = new Pool({
      connectionString:
        process.env.DATABASE_URL_APP ??
        'postgresql://app_user:app_password@localhost:5433/hrms_dev?schema=public',
    });
    const client = await userPool.connect();
    try {
      const result = await client.query<{
        sessions: string;
        receipts: string;
        syncs: string;
      }>(
        'SELECT (SELECT count(*) FROM field_tracking_sessions)::text AS sessions, (SELECT count(*) FROM field_ping_receipts)::text AS receipts, (SELECT count(*) FROM attendance_sync_receipts)::text AS syncs',
      );
      expect(result.rows[0]).toEqual({
        sessions: '0',
        receipts: '0',
        syncs: '0',
      });
    } finally {
      client.release();
      await userPool.end();
    }
  });

  it('completes the fixed 240-ping field day with exactly-once replay', async () => {
    const fieldUser = await createSession('EMPLOYEE', 'acceptance');
    const department = await factory.createDepartment({
      tenantId,
      name: `Acceptance Field ${stamp}`,
    });
    const fieldEmployeeId = (
      await factory.createEmployee({
        tenantId,
        deptId: department.id,
        userId: fieldUser.userId,
        employeeCode: `S6-A-${stamp}`,
        fullName: 'Maha Acceptance Route',
        workType: 'FIELD',
      })
    ).id;
    const fieldDeviceUuid = randomUUID();
    await prisma.registeredDevice.create({
      data: {
        tenantId,
        employeeId: fieldEmployeeId,
        deviceUuid: fieldDeviceUuid,
        platform: 'ANDROID',
        status: 'ACTIVE',
        isPrimary: true,
      },
    });
    const started = await api(fieldUser)
      .post('/field-sessions/start')
      .send({
        deviceUuid: fieldDeviceUuid,
        clientStartUuid: randomUUID(),
      })
      .expect(201);
    const sessionId = (started.body as { data: { id: string } }).data.id;
    const pings = acceptancePings(sessionId);
    const batches = [
      pings.slice(0, 80),
      pings.slice(80, 160),
      pings.slice(160),
    ];
    for (const items of batches) {
      await api(fieldUser)
        .post('/field-pings/batch')
        .send({ deviceUuid: fieldDeviceUuid, items })
        .expect(201);
    }
    await api(fieldUser)
      .post('/field-pings/batch')
      .send({ deviceUuid: fieldDeviceUuid, items: batches[1] })
      .expect(201)
      .expect(({ body }) => {
        expect(
          (body as { data: Array<{ status: string }> }).data.every(
            ({ status }) => status === 'DUPLICATE',
          ),
        ).toBe(true);
      });

    expect(
      await prisma.fieldLocationPing.count({
        where: { tenantId, employeeId: fieldEmployeeId },
      }),
    ).toBe(240);
    expect(
      await prisma.fieldPingReceipt.count({
        where: { tenantId, employeeId: fieldEmployeeId },
      }),
    ).toBe(240);
    const summary = await prisma.fieldRouteSummary.findFirstOrThrow({
      where: { tenantId, employeeId: fieldEmployeeId },
    });
    expect(summary.pingCount).toBe(240);
    expect(summary.trackingGapMinutes).toBe(22);
    expect(summary.gaps).toEqual([
      expect.objectContaining({ durationMinutes: 22 }),
    ]);
    expect(summary.stops).toHaveLength(6);
    expect(summary.algorithmVersion).toBeGreaterThan(0);

    const attendanceItems = acceptanceAttendanceItems(fieldDeviceUuid);
    await api(fieldUser)
      .post('/attendance/sync')
      .send({ items: attendanceItems })
      .expect(201)
      .expect(({ body }) => {
        expect(
          (body as { data: Array<{ status: string }> }).data.map(
            ({ status }) => status,
          ),
        ).toEqual(['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED']);
      });
    await api(fieldUser)
      .post('/attendance/sync')
      .send({ items: attendanceItems })
      .expect(201)
      .expect(({ body }) => {
        expect(
          (body as { data: Array<{ status: string }> }).data.every(
            ({ status }) => status === 'DUPLICATE',
          ),
        ).toBe(true);
      });
    expect(
      await prisma.attendanceEvent.count({
        where: { tenantId, employeeId: fieldEmployeeId },
      }),
    ).toBe(4);
    expect(
      await prisma.fieldTrackingSession.count({
        where: { tenantId, employeeId: fieldEmployeeId, endedAt: null },
      }),
    ).toBe(0);
  });

  it('returns coded retry guidance for rate and body limits', async () => {
    process.env.FIELD_DEVICE_PINGS_PER_MINUTE = '1';
    try {
      await api(employee)
        .post('/field-pings/batch')
        .send({
          deviceUuid,
          items: [
            {
              clientPingUuid: randomUUID(),
              sessionId: randomUUID(),
              latitude: 23.588,
              longitude: 58.382,
              capturedAt: new Date().toISOString(),
            },
          ],
        })
        .expect(429)
        .expect('Retry-After', /\d+/)
        .expect(({ body }) =>
          expect((body as { code: string }).code).toBe('PING_RATE_LIMITED'),
        );
    } finally {
      delete process.env.FIELD_DEVICE_PINGS_PER_MINUTE;
    }

    await api(employee)
      .post('/field-pings/batch')
      .send({ padding: 'x'.repeat(300 * 1024) })
      .expect(413)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('PING_BATCH_TOO_LARGE'),
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
    };
  }

  async function createSession(
    roleName: keyof typeof DEFAULT_ROLE_PERMISSIONS,
    suffix = '',
  ): Promise<Session> {
    const password = 'Sprint6User123!';
    const user = await factory.createUser({
      tenantId,
      email: `${roleName.toLowerCase()}${suffix ? `-${suffix}` : ''}-${stamp}@sprint6.test`,
      passwordHash: await argon2.hash(password),
    });
    const role =
      (await prisma.role.findUnique({
        where: { tenantId_name: { tenantId, name: roleName } },
      })) ?? (await factory.createSystemRole(tenantId, roleName));
    await factory.assignRole(user.id, role.id);
    const session = await TenantContextService.run({ tenantId }, () =>
      auth.login(user.email, password, '127.0.0.1', 'sprint6-jest'),
    );
    return { tenantId, userId: user.id, accessToken: session.accessToken };
  }
});

function acceptancePings(sessionId: string) {
  const points: Array<{
    latitude: number;
    longitude: number;
    capturedAt: Date;
  }> = [];
  const start = new Date(Date.now() - 6 * 60 * 60_000);
  let minute = 0;
  const centers = Array.from({ length: 6 }, (_, index) => ({
    latitude: 23.58 + index * 0.005,
    longitude: 58.38 + index * 0.005,
  }));
  for (let stop = 0; stop < centers.length; stop += 1) {
    const center = centers[stop];
    for (let index = 0; index < 10; index += 1) {
      points.push({
        ...center,
        capturedAt: new Date(start.getTime() + minute * 60_000),
      });
      minute += 1;
    }
    const next = centers[stop + 1];
    if (!next) continue;
    for (let index = 1; index <= 36; index += 1) {
      if (stop === 2 && index === 18) minute += 21;
      const ratio = index / 36;
      points.push({
        latitude: center.latitude + (next.latitude - center.latitude) * ratio,
        longitude:
          center.longitude + (next.longitude - center.longitude) * ratio,
        capturedAt: new Date(start.getTime() + minute * 60_000),
      });
      minute += 1;
    }
  }
  expect(points).toHaveLength(240);
  return points.map((point, index) => ({
    clientPingUuid: randomUUID(),
    sessionId,
    latitude: point.latitude,
    longitude: point.longitude,
    accuracyM: 8,
    speedMps: 2,
    batteryLevel: Math.max(30, 95 - Math.floor(index / 4)),
    capturedAt: point.capturedAt.toISOString(),
    isOfflineSync: index < 80,
  }));
}

function acceptanceAttendanceItems(deviceUuid: string) {
  const base = completedTenantDayBase();
  return ['CHECKIN', 'BREAK_START', 'BREAK_END', 'CHECKOUT'].map(
    (type, index) => {
      const clientTime = new Date(base.getTime() + index * 3 * 60_000);
      return {
        clientEventUuid: randomUUID(),
        type,
        deviceUuid,
        attestationToken: 'offline-integrity-valid',
        integrityIssuedAt: new Date(
          clientTime.getTime() - 60_000,
        ).toISOString(),
        integrityExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        clientTime: clientTime.toISOString(),
        clientClockOffsetSeconds: 15,
        latitude: 23.588,
        longitude: 58.382,
        accuracyMeters: 8,
      };
    },
  );
}

function completedTenantDayBase() {
  const currentTenantDate = dateInTimeZone(new Date(), 'Asia/Kolkata');
  const previousDate = new Date(`${currentTenantDate}T00:00:00.000Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const date = previousDate.toISOString().slice(0, 10);
  return new Date(`${date}T19:00:00.000+05:30`);
}

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

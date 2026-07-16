import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { generateTotp } from '../src/modules/platform/platform-auth/totp';
import { HealthService } from '../src/shared/health/health.service';

describe('Platform dashboard, audit, alerts and health (e2e)', () => {
  let app: INestApplication<App>;
  let degradedApp: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  const stamp = Date.now();
  const email = `operations-owner-${stamp}@deltcrm.test`;
  const password = 'PlatformOwner123!';
  const secret = 'JBSWY3DPEHPK3PXP';
  let platformUserId = '';
  let alertId = '';

  beforeAll(async () => {
    app = (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication<INestApplication<App>>();
    await app.init();
    degradedApp = (
      await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(HealthService)
        .useValue({
          liveness: () => ({ status: 'ok' }),
          dependencies: () =>
            Promise.resolve({
              database: { status: 'up', latencyMs: 4 },
              redis: { status: 'down', latencyMs: 2001 },
              objectStorage: { status: 'down', latencyMs: 2002 },
            }),
          readiness: () =>
            Promise.reject(
              new ServiceUnavailableException({
                code: 'DEPENDENCY_UNAVAILABLE',
                message: 'One or more required dependencies are unavailable',
              }),
            ),
        })
        .compile()
    ).createNestApplication<INestApplication<App>>();
    await degradedApp.init();
    pool = new Pool({
      connectionString:
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    platformUserId = (
      await prisma.platformUser.create({
        data: {
          email,
          passwordHash: await argon2.hash(password),
          role: 'SUPER_ADMIN',
          mfaSecret: secret,
          mfaEnabled: true,
        },
      })
    ).id;
    alertId = (
      await prisma.systemAlert.create({
        data: {
          alertType: 'QUEUE_LAG',
          severity: 'WARNING',
          title: `Acceptance queue alert ${stamp}`,
          payload: { pending: 12 },
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.systemAuditLog.deleteMany({
      where: { actorPlatformUserId: platformUserId },
    });
    await prisma.systemAlert.deleteMany({ where: { id: alertId } });
    await prisma.platformUser.deleteMany({ where: { id: platformUserId } });
    await app.close();
    await degradedApp.close();
    await prisma.$disconnect();
    await pool.end();
  });

  async function token() {
    return tokenFor(app);
  }

  async function tokenFor(targetApp: INestApplication<App>) {
    const login = await request(targetApp.getHttpServer())
      .post('/platform/auth/login')
      .send({ email, password })
      .expect(200);
    const verified = await request(targetApp.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .send({
        challengeToken: (login.body as { challengeToken: string })
          .challengeToken,
        code: generateTotp(secret),
      })
      .expect(200);
    return (verified.body as { accessToken: string }).accessToken;
  }

  it('serves operational data and attributes alert decisions', async () => {
    const accessToken = await token();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const dashboard = await request(app.getHttpServer())
      .get('/platform/dashboard')
      .set(auth)
      .expect(200);
    expect(dashboard.body).toMatchObject({
      metrics: {
        tenants: expect.any(Number) as number,
        employees: expect.any(Number) as number,
        projectedMrr: expect.any(Number) as number,
      },
      planMix: expect.any(Array) as unknown[],
      recentTenants: expect.any(Array) as unknown[],
    });

    const health = await request(app.getHttpServer())
      .get('/platform/health')
      .set(auth)
      .expect(200);
    expect(health.body).toMatchObject({
      status: expect.stringMatching(/healthy|degraded/) as string,
      services: {
        api: { status: 'up' },
        database: { status: 'up' },
        queue: { pending: expect.any(Number) as number },
      },
    });

    await request(app.getHttpServer())
      .post(`/platform/alerts/${alertId}/acknowledge`)
      .set(auth)
      .set('x-request-id', `alert-ack-${stamp}`)
      .send({ note: 'Operations owner is investigating the queue lag' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/platform/alerts/${alertId}/resolve`)
      .set(auth)
      .set('x-request-id', `alert-resolve-${stamp}`)
      .send({ note: 'Queue backlog has returned to normal' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/platform/alerts/${alertId}/resolve`)
      .set(auth)
      .send({ note: 'Duplicate resolution must be rejected' })
      .expect(409);

    const alerts = await request(app.getHttpServer())
      .get('/platform/alerts?status=RESOLVED')
      .set(auth)
      .expect(200);
    expect(
      (alerts.body as { data: Array<{ id: string }> }).data.some(
        (alert) => alert.id === alertId,
      ),
    ).toBe(true);

    const audits = await request(app.getHttpServer())
      .get('/platform/audit-logs?module=platform.operations')
      .set(auth)
      .expect(200);
    const records = (
      audits.body as {
        data: Array<{
          id: string;
          actor: { email: string };
          requestId: string;
        }>;
      }
    ).data;
    expect(records).toHaveLength(2);
    expect(records[0].actor.email).toBe(email);
    expect(records.map((record) => record.requestId)).toContain(
      `alert-resolve-${stamp}`,
    );

    await request(app.getHttpServer())
      .get(`/platform/audit-logs/${records[0].id}`)
      .set(auth)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          actor: { email },
          module: 'platform.operations',
        });
      });
  });

  it('reports deterministic Redis and object-storage degradation', async () => {
    await request(degradedApp.getHttpServer()).get('/healthz').expect(200);
    await request(degradedApp.getHttpServer()).get('/readyz').expect(503);
    const accessToken = await tokenFor(degradedApp);
    const response = await request(degradedApp.getHttpServer())
      .get('/platform/health')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(response.body).toMatchObject({
      status: 'degraded',
      services: {
        database: { status: 'up' },
        redis: { status: 'down' },
        objectStorage: { status: 'down' },
      },
    });
  });
});

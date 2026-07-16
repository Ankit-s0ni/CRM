import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { generateTotp } from '../src/modules/platform/platform-auth/totp';

const BUDGET_MS = 2500;
const FIXTURE_SIZE = 10_000;

describe('Platform query performance budgets (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  const stamp = Date.now();
  const prefix = `perf-${stamp}`;
  const email = `${prefix}@deltcrm.test`;
  const password = 'PlatformOwner123!';
  const secret = 'JBSWY3DPEHPK3PXP';
  let ownerId = '';

  beforeAll(async () => {
    app = (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication<INestApplication<App>>();
    await app.init();
    pool = new Pool({
      connectionString:
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    ownerId = (
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
    await prisma.$executeRaw`
      INSERT INTO tenants (id, "companyName", subdomain, status, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), ${prefix} || '-company-' || series,
        ${prefix} || '-' || series, 'ACTIVE'::"TenantStatus", NOW(), NOW()
      FROM generate_series(1, ${FIXTURE_SIZE}) AS series
    `;
    await prisma.$executeRaw`
      INSERT INTO system_audit_logs
        (id, "actorPlatformUserId", action, module, "requestId", "createdAt")
      SELECT gen_random_uuid(), ${ownerId}::uuid, 'platform.performance.fixture',
        'platform.performance', ${prefix} || '-' || series, NOW()
      FROM generate_series(1, ${FIXTURE_SIZE}) AS series
    `;
  }, 30_000);

  afterAll(async () => {
    if (!prisma) return;
    await prisma.systemAuditLog.deleteMany({
      where: {
        OR: [
          { module: 'platform.performance' },
          { actorPlatformUserId: ownerId },
        ],
      },
    });
    await prisma.tenant.deleteMany({
      where: { subdomain: { startsWith: prefix } },
    });
    await prisma.platformUser.deleteMany({ where: { id: ownerId } });
    await app.close();
    await prisma.$disconnect();
    await pool.end();
  }, 30_000);

  async function token() {
    const login = await request(app.getHttpServer())
      .post('/platform/auth/login')
      .send({ email, password })
      .expect(200);
    const verified = await request(app.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .send({
        challengeToken: (login.body as { challengeToken: string })
          .challengeToken,
        code: generateTotp(secret),
      })
      .expect(200);
    return (verified.body as { accessToken: string }).accessToken;
  }

  it('keeps directory, audit and dashboard reads within budget', async () => {
    const accessToken = await token();
    const authorization = `Bearer ${accessToken}`;

    await withinBudget('tenant directory', async () => {
      const response = await request(app.getHttpServer())
        .get('/platform/tenants')
        .query({ search: prefix, page: 1, limit: 100 })
        .set('Authorization', authorization)
        .expect(200);
      const body = response.body as { pagination: { total: number } };
      expect(body.pagination.total).toBe(FIXTURE_SIZE);
    });

    await withinBudget('audit pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/platform/audit-logs')
        .query({ module: 'platform.performance', page: 1, limit: 100 })
        .set('Authorization', authorization)
        .expect(200);
      const body = response.body as { pagination: { total: number } };
      expect(body.pagination.total).toBe(FIXTURE_SIZE);
    });

    await withinBudget('dashboard aggregates', async () => {
      const response = await request(app.getHttpServer())
        .get('/platform/dashboard')
        .set('Authorization', authorization)
        .expect(200);
      const body = response.body as { metrics: { tenants: number } };
      expect(body.metrics.tenants).toBeGreaterThanOrEqual(FIXTURE_SIZE);
    });
  }, 30_000);
});

async function withinBudget(label: string, operation: () => Promise<void>) {
  const startedAt = performance.now();
  await operation();
  const elapsed = performance.now() - startedAt;
  expect({ label, elapsed }).toEqual({
    label,
    elapsed: expect.any(Number) as number,
  });
  expect(elapsed).toBeLessThan(BUDGET_MS);
}

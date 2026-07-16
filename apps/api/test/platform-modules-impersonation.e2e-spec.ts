import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { generateTotp } from '../src/modules/platform/platform-auth/totp';

type ChallengeBody = { challengeToken: string };
type PlatformSessionBody = { accessToken: string };
type ReplacementBody = { data: Array<{ isActive: boolean }> };
type StartedBody = {
  accessToken: string;
  refreshToken: null;
  session: { impersonationSessionId: string };
  target: { id: string };
  workspace: { id: string };
};

describe('Platform modules and impersonation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  const stamp = Date.now();
  const ownerEmail = `modules-owner-${stamp}@deltcrm.test`;
  const password = 'PlatformOwner123!';
  const secret = 'JBSWY3DPEHPK3PXP';
  const baseKey = `BASE_${stamp}`;
  const dependentKey = `DEPENDENT_${stamp}`;
  let ownerId = '';
  let tenantId = '';
  let targetUserId = '';
  let roleId = '';

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
          email: ownerEmail,
          passwordHash: await argon2.hash(password),
          role: 'SUPER_ADMIN',
          mfaSecret: secret,
          mfaEnabled: true,
        },
      })
    ).id;
    tenantId = (
      await prisma.tenant.create({
        data: {
          companyName: `Impersonation ${stamp}`,
          subdomain: `impersonation-${stamp}`,
          status: 'ACTIVE',
        },
      })
    ).id;
    await prisma.tenantSettings.create({ data: { tenantId } });
    const plan = await prisma.subscriptionPlan.findFirstOrThrow();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: plan.id,
        status: 'ACTIVE',
        seatCount: 10,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });
    const permission = await prisma.permission.upsert({
      where: { key: 'organization.employees.read' },
      update: {},
      create: { key: 'organization.employees.read' },
    });
    roleId = (
      await prisma.role.create({ data: { tenantId, name: `Reader ${stamp}` } })
    ).id;
    await prisma.rolePermission.create({
      data: { roleId, permissionId: permission.id },
    });
    targetUserId = (
      await prisma.user.create({
        data: {
          tenantId,
          email: `target-${stamp}@tenant.test`,
          passwordHash: await argon2.hash('TenantUser123!'),
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          roles: { create: { roleId } },
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.impersonationSession.deleteMany({
      where: { platformUserId: ownerId },
    });
    await prisma.systemAuditLog.deleteMany({
      where: { actorPlatformUserId: ownerId },
    });
    await prisma.tenantAuditLog.deleteMany({ where: { tenantId } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId } });
    await prisma.tenantModule.deleteMany({ where: { tenantId } });
    await prisma.userRole.deleteMany({ where: { userId: targetUserId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.role.deleteMany({ where: { tenantId } });
    await prisma.tenantSettings.deleteMany({ where: { tenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.module.deleteMany({
      where: { key: { in: [baseKey, dependentKey] } },
    });
    await prisma.platformUser.deleteMany({ where: { id: ownerId } });
    await app.close();
    await prisma.$disconnect();
    await pool.end();
  });

  async function platformToken() {
    const login = await request(app.getHttpServer())
      .post('/platform/auth/login')
      .send({ email: ownerEmail, password })
      .expect(200);
    const verified = await request(app.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .send({
        challengeToken: (login.body as ChallengeBody).challengeToken,
        code: generateTotp(secret),
      })
      .expect(200);
    return (verified.body as PlatformSessionBody).accessToken;
  }

  it('enforces module rules and a revocable scoped support session', async () => {
    const token = await platformToken();
    await request(app.getHttpServer())
      .post('/platform/modules')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: baseKey, name: 'Base Test Module' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/platform/modules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        key: dependentKey,
        name: 'Dependent Test Module',
        dependencyKeys: [baseKey],
      })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/platform/tenants/${tenantId}/modules`)
      .set('Authorization', `Bearer ${token}`)
      .send({ moduleKeys: [dependentKey] })
      .expect(409);
    const replacement = await request(app.getHttpServer())
      .put(`/platform/tenants/${tenantId}/modules`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-request-id', `modules-${stamp}`)
      .send({ moduleKeys: [baseKey, dependentKey] })
      .expect(200);
    const replacementBody = replacement.body as ReplacementBody;
    expect(
      replacementBody.data.filter(
        (item: { isActive: boolean }) => item.isActive,
      ),
    ).toHaveLength(2);

    const started = await request(app.getHttpServer())
      .post(`/platform/tenants/${tenantId}/impersonations`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-request-id', `impersonate-${stamp}`)
      .send({
        targetUserId,
        reason: 'Investigating an employee directory support issue',
        scopes: ['organization.employees.read'],
        minutes: 10,
      })
      .expect(201);
    const startedBody = started.body as StartedBody;
    const impersonationToken = startedBody.accessToken;
    const sessionId = startedBody.session.impersonationSessionId;
    expect(startedBody).toMatchObject({
      refreshToken: null,
      target: { id: targetUserId },
      workspace: { id: tenantId },
    });
    await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${impersonationToken}`)
      .set('x-tenant-id', tenantId)
      .expect(200);
    await request(app.getHttpServer())
      .get('/billing/subscription')
      .set('Authorization', `Bearer ${impersonationToken}`)
      .set('x-tenant-id', tenantId)
      .expect(403);
    await request(app.getHttpServer())
      .get('/platform/tenants')
      .set('Authorization', `Bearer ${impersonationToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('x-tenant-id', tenantId)
      .send({ refreshToken: impersonationToken })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/platform/impersonations/${sessionId}/end`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Support investigation completed' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${impersonationToken}`)
      .set('x-tenant-id', tenantId)
      .expect(401);
    expect(
      await prisma.systemAuditLog.count({
        where: { impersonationSessionId: sessionId },
      }),
    ).toBe(2);
    expect(
      await prisma.tenantAuditLog.count({
        where: { impersonationSessionId: sessionId },
      }),
    ).toBe(2);
  });
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { generateTotp } from '../src/modules/platform/platform-auth/totp';

type PlatformSession = { accessToken: string };
type CreatedTenant = {
  tenant: {
    id: string;
    companyName: string;
    subdomain: string;
    status: string;
  };
  idempotencyReplayed: boolean;
  invitation: { email: string; debugInvitationToken?: string };
};

describe('Platform tenant lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let platformUserId = '';
  let supportUserId = '';
  let tenantId = '';

  const stamp = Date.now();
  const platformEmail = `tenant-owner-${stamp}@deltcrm.test`;
  const platformPassword = 'PlatformOwner123!';
  const mfaSecret = 'JBSWY3DPEHPK3PXP';
  const companyName = `Lifecycle Company ${stamp}`;
  const subdomain = `lifecycle-${stamp}`;
  const adminEmail = `tenant-admin-${stamp}@deltcrm.test`;
  const tenantPassword = 'TenantAdmin123!';
  const idempotencyKey = `tenant-onboarding-${stamp}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();

    pool = new Pool({
      connectionString:
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const platformUser = await prisma.platformUser.create({
      data: {
        email: platformEmail,
        passwordHash: await argon2.hash(platformPassword),
        role: 'SUPER_ADMIN',
        mfaSecret,
        mfaEnabled: true,
      },
    });
    platformUserId = platformUser.id;
    const supportUser = await prisma.platformUser.create({
      data: {
        email: `tenant-support-${stamp}@deltcrm.test`,
        passwordHash: await argon2.hash(platformPassword),
        role: 'SUPPORT',
        mfaSecret,
        mfaEnabled: true,
      },
    });
    supportUserId = supportUser.id;
  });

  afterAll(async () => {
    if (tenantId) await cleanupTenant(tenantId);
    if (platformUserId) {
      await prisma.systemAuditLog.deleteMany({
        where: { actorPlatformUserId: platformUserId },
      });
      await prisma.platformUser.delete({ where: { id: platformUserId } });
    }
    if (supportUserId) {
      await prisma.systemAuditLog.deleteMany({
        where: { actorPlatformUserId: supportUserId },
      });
      await prisma.platformUser.delete({ where: { id: supportUserId } });
    }
    await app.close();
    await prisma.$disconnect();
    await pool.end();
  });

  async function cleanupTenant(id: string) {
    const users = await prisma.user.findMany({
      where: { tenantId: id },
      select: { id: true },
    });
    const userIds = users.map(({ id: userId }) => userId);
    const roles = await prisma.role.findMany({
      where: { tenantId: id },
      select: { id: true },
    });
    const roleIds = roles.map(({ id: roleId }) => roleId);
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.rolePermission.deleteMany({
      where: { roleId: { in: roleIds } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.verificationToken.deleteMany({ where: { tenantId: id } });
    await prisma.loginAttempt.deleteMany({ where: { tenantId: id } });
    await prisma.tenantAuditLog.deleteMany({ where: { tenantId: id } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId: id } });
    await prisma.user.deleteMany({ where: { tenantId: id } });
    await prisma.role.deleteMany({ where: { tenantId: id } });
    await prisma.tenantModule.deleteMany({ where: { tenantId: id } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: id } });
    await prisma.tenantSettings.deleteMany({ where: { tenantId: id } });
    await prisma.tenant.delete({ where: { id } });
  }

  async function platformSession(
    email = platformEmail,
  ): Promise<PlatformSession> {
    const login = await request(app.getHttpServer())
      .post('/platform/auth/login')
      .send({ email, password: platformPassword })
      .expect(200);
    const challenge = login.body as { challengeToken: string };
    const verified = await request(app.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .send({
        challengeToken: challenge.challengeToken,
        code: generateTotp(mfaSecret),
      })
      .expect(200);
    return verified.body as PlatformSession;
  }

  it('provisions, manages, suspends, and reactivates a tenant safely', async () => {
    const platform = await platformSession();
    const plans = await request(app.getHttpServer())
      .get('/platform/plans')
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .expect(200);
    const plan = (
      plans.body as { data: Array<{ id: string; name: string }> }
    ).data.find(({ name }) => name === 'Starter Trial');
    expect(plan).toBeTruthy();

    const createPayload = {
      companyName,
      subdomain,
      adminEmail,
      planId: plan!.id,
      moduleKeys: ['ATTENDANCE'],
      timezone: 'Asia/Kolkata',
      seatCount: 100,
    };
    const support = await platformSession(
      `tenant-support-${stamp}@deltcrm.test`,
    );
    await request(app.getHttpServer())
      .get('/platform/tenants')
      .set('Authorization', `Bearer ${support.accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/platform/tenants')
      .set('Authorization', `Bearer ${support.accessToken}`)
      .set('Idempotency-Key', `support-denied-${stamp}`)
      .send({ ...createPayload, subdomain: `support-denied-${stamp}` })
      .expect(403);
    const createdResponse = await request(app.getHttpServer())
      .post('/platform/tenants')
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .set('x-request-id', `create-${stamp}`)
      .send(createPayload)
      .expect(201);
    const created = createdResponse.body as CreatedTenant;
    tenantId = created.tenant.id;
    expect(created).toMatchObject({
      tenant: { companyName, subdomain, status: 'ACTIVE' },
      idempotencyReplayed: false,
      invitation: { email: adminEmail },
    });
    expect(created.invitation.debugInvitationToken).toHaveLength(64);
    expect(JSON.stringify(created)).not.toMatch(/password|passwordHash/i);
    expect(await prisma.user.count({ where: { tenantId } })).toBe(0);

    const storedInvitation = await prisma.verificationToken.findFirst({
      where: { tenantId, purpose: 'USER_INVITE' },
    });
    expect(storedInvitation?.tokenHash).not.toBe(
      created.invitation.debugInvitationToken,
    );

    const replay = await request(app.getHttpServer())
      .post('/platform/tenants')
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(createPayload)
      .expect(201);
    const replayBody = replay.body as CreatedTenant;
    expect(replayBody.tenant.id).toBe(tenantId);
    expect(replayBody.idempotencyReplayed).toBe(true);
    expect(replayBody.invitation.debugInvitationToken).toBeUndefined();

    await request(app.getHttpServer())
      .post('/platform/tenants')
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ ...createPayload, companyName: `${companyName} changed` })
      .expect(409);

    const directory = await request(app.getHttpServer())
      .get('/platform/tenants')
      .query({
        search: subdomain,
        status: 'ACTIVE',
        planId: plan!.id,
        moduleKey: 'ATTENDANCE',
      })
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .expect(200);
    expect((directory.body as { data: Array<{ id: string }> }).data).toEqual([
      expect.objectContaining({ id: tenantId }),
    ]);

    await request(app.getHttpServer())
      .patch(`/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .set('x-request-id', `update-${stamp}`)
      .send({ companyName: `${companyName} Updated`, timezone: 'Asia/Dubai' })
      .expect(200);
    const detail = await request(app.getHttpServer())
      .get(`/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .expect(200);
    expect(detail.body).toMatchObject({
      tenant: {
        id: tenantId,
        companyName: `${companyName} Updated`,
        settings: { timezone: 'Asia/Dubai' },
      },
      usage: { employees: 0, seats: 100, percentage: 0 },
      modules: [expect.objectContaining({ key: 'ATTENDANCE', isActive: true })],
    });

    await request(app.getHttpServer())
      .post('/auth/invitations/accept')
      .send({
        token: created.invitation.debugInvitationToken,
        password: tenantPassword,
      })
      .expect(201);
    const tenantLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', tenantId)
      .send({ email: adminEmail, password: tenantPassword })
      .expect(200);
    const tenantSession = tenantLogin.body as {
      accessToken: string;
      refreshToken: string;
    };

    await request(app.getHttpServer())
      .post(`/platform/tenants/${tenantId}/suspend`)
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .set('x-request-id', `suspend-${stamp}`)
      .send({ reason: 'Security review requested by the account owner' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${tenantSession.accessToken}`)
      .set('x-tenant-id', tenantId)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/platform/tenants/${tenantId}/reactivate`)
      .set('Authorization', `Bearer ${platform.accessToken}`)
      .set('x-request-id', `reactivate-${stamp}`)
      .send({ reason: 'Security review completed and access approved' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('x-tenant-id', tenantId)
      .send({ refreshToken: tenantSession.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', tenantId)
      .send({ email: adminEmail, password: tenantPassword })
      .expect(200);

    const actions = await prisma.systemAuditLog.findMany({
      where: {
        actorPlatformUserId: platformUserId,
        module: 'platform.tenants',
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(actions.map(({ action }) => action)).toEqual([
      'platform.tenant.created',
      'platform.tenant.updated',
      'platform.tenant.suspended',
      'platform.tenant.reactivated',
    ]);
    expect(actions.map(({ requestId }) => requestId)).toEqual([
      `create-${stamp}`,
      `update-${stamp}`,
      `suspend-${stamp}`,
      `reactivate-${stamp}`,
    ]);
    const events = await prisma.outboxEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
    expect(events.map(({ eventKey }) => eventKey)).toEqual([
      'platform.tenant.created',
      'platform.tenant.suspended',
      'platform.tenant.reactivated',
    ]);
  });
});

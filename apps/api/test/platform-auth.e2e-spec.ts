import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { generateTotp } from '../src/modules/platform/platform-auth/totp';

type ChallengeResponse = {
  mfaRequired: boolean;
  challengeToken: string;
  expiresIn: number;
};
type SessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: { role: string; permissions: string[] };
  session: { id: string };
};

describe('Platform authentication (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let tenantPool: Pool;
  let platformPool: Pool;

  const stamp = Date.now();
  const email = `platform-owner-${stamp}@deltcrm.test`;
  const password = 'PlatformOwner123!';
  const mfaSecret = 'JBSWY3DPEHPK3PXP';
  let platformUserId = '';

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
    tenantPool = new Pool({
      connectionString:
        'postgresql://app_user:app_password@localhost:5433/hrms_dev?schema=public',
    });
    platformPool = new Pool({
      connectionString:
        'postgresql://platform_runtime:platform_password@localhost:5433/hrms_dev?schema=public',
    });
    const user = await prisma.platformUser.create({
      data: {
        email,
        passwordHash: await argon2.hash(password),
        role: 'SUPER_ADMIN',
        mfaSecret,
        mfaEnabled: true,
      },
    });
    platformUserId = user.id;
  });

  afterAll(async () => {
    if (platformUserId) {
      await prisma.systemAuditLog.deleteMany({
        where: { actorPlatformUserId: platformUserId },
      });
      await prisma.platformUser.delete({ where: { id: platformUserId } });
    }
    await app.close();
    await prisma.$disconnect();
    await pool.end();
    await tenantPool.end();
    await platformPool.end();
  });

  async function passwordStage() {
    const response = await request(app.getHttpServer())
      .post('/platform/auth/login')
      .set('x-request-id', `platform-login-${stamp}`)
      .send({ email, password })
      .expect(200);
    return response.body as ChallengeResponse;
  }

  async function completeMfa(challengeToken: string) {
    const response = await request(app.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .set('x-request-id', `platform-mfa-${stamp}`)
      .send({ challengeToken, code: generateTotp(mfaSecret) })
      .expect(200);
    return response.body as SessionResponse;
  }

  it('enforces MFA, isolated sessions, rotation, replay detection, and lockout', async () => {
    await request(app.getHttpServer())
      .post('/platform/auth/login')
      .send({ email, password: 'WrongPassword!' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/platform/auth/login')
      .set('x-tenant-id', '019f6b4d-0000-7000-8000-000000000000')
      .send({ email, password })
      .expect(200);

    await expect(
      tenantPool.query('SELECT id FROM platform_users LIMIT 1'),
    ).rejects.toThrow(/permission denied/);
    await expect(
      tenantPool.query('SELECT id FROM system_audit_logs LIMIT 1'),
    ).rejects.toThrow(/permission denied/);
    await expect(
      tenantPool.query('SELECT id FROM system_alerts LIMIT 1'),
    ).rejects.toThrow(/permission denied/);
    await expect(
      tenantPool.query('SELECT id FROM impersonation_sessions LIMIT 1'),
    ).rejects.toThrow(/permission denied/);
    await expect(
      platformPool.query(
        'UPDATE system_audit_logs SET action = action WHERE false',
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      platformPool.query('DELETE FROM system_audit_logs WHERE false'),
    ).rejects.toThrow(/permission denied/);

    const passwordResponse = await passwordStage();
    expect(passwordResponse).toMatchObject({
      mfaRequired: true,
      expiresIn: 300,
    });
    expect(passwordResponse.challengeToken).toHaveLength(43);

    const validCode = generateTotp(mfaSecret);
    const invalidCode = validCode === '000000' ? '000001' : '000000';
    await request(app.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .send({
        challengeToken: passwordResponse.challengeToken,
        code: invalidCode,
      })
      .expect(401);

    const session = await completeMfa(passwordResponse.challengeToken);
    expect(session.user.role).toBe('SUPER_ADMIN');
    expect(session.user.permissions).toContain('platform.tenants.lifecycle');

    await request(app.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .send({
        challengeToken: passwordResponse.challengeToken,
        code: generateTotp(mfaSecret),
      })
      .expect(401);

    const meResponse = await request(app.getHttpServer())
      .get('/platform/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    const meBody = meResponse.body as {
      user: { email: string; role: string };
    };
    expect(meBody.user).toMatchObject({ email, role: 'SUPER_ADMIN' });

    const tenantToken = new JwtService().sign(
      { sub: platformUserId, tenantId: 'not-platform', roles: [] },
      { secret: 'super-secret-default-key-change-in-production' },
    );
    await request(app.getHttpServer())
      .get('/platform/auth/me')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(401);

    const refreshResponse = await request(app.getHttpServer())
      .post('/platform/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    const refreshBody = refreshResponse.body as SessionResponse;
    const rotatedRefreshToken = refreshBody.refreshToken;
    expect(rotatedRefreshToken).not.toBe(session.refreshToken);

    await request(app.getHttpServer())
      .post('/platform/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/platform/auth/refresh')
      .send({ refreshToken: rotatedRefreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .get('/platform/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(401);

    const secondPassword = await passwordStage();
    const secondSession = await completeMfa(secondPassword.challengeToken);
    await request(app.getHttpServer())
      .post('/platform/auth/logout')
      .set('Authorization', `Bearer ${secondSession.accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform/auth/me')
      .set('Authorization', `Bearer ${secondSession.accessToken}`)
      .expect(401);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/platform/auth/login')
        .send({ email, password: 'WrongPassword!' })
        .expect(401);
    }
    const locked = await request(app.getHttpServer())
      .post('/platform/auth/login')
      .send({ email, password })
      .expect(423);
    expect((locked.body as { code: string }).code).toBe(
      'PLATFORM_ACCOUNT_LOCKED',
    );

    const audits = await prisma.systemAuditLog.findMany({
      where: { actorPlatformUserId: platformUserId },
      orderBy: { createdAt: 'asc' },
    });
    expect(audits.map(({ action }) => action)).toEqual([
      'platform.auth.login',
      'platform.auth.login',
      'platform.auth.logout',
    ]);
    expect(audits[0]?.requestId).toBe(`platform-mfa-${stamp}`);
    expect(audits.every(({ ipAddress }) => Boolean(ipAddress))).toBe(true);
  });
});

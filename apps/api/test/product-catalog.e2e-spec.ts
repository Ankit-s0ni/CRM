import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PlatformRole, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { generateTotp } from '../src/platform/control-plane/platform-auth/totp';

describe('Platform product catalog and plan entitlements (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let platformUserId = '';
  let accessToken = '';
  let createdPlanId = '';
  let impactTenantId = '';

  const stamp = Date.now();
  const email = `catalog-owner-${stamp}@deltcrm.test`;
  const password = 'PlatformOwner123!';
  const mfaSecret = 'JBSWY3DPEHPK3PXP';

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
    platformUserId = (
      await prisma.platformUser.create({
        data: {
          email,
          passwordHash: await argon2.hash(password),
          role: PlatformRole.SUPER_ADMIN,
          mfaEnabled: true,
          mfaSecret,
        },
      })
    ).id;
    const login = await request(app.getHttpServer())
      .post('/platform/auth/login')
      .send({ email, password })
      .expect(200);
    const verified = await request(app.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .send({
        challengeToken: (login.body as { challengeToken: string })
          .challengeToken,
        code: generateTotp(mfaSecret),
      })
      .expect(200);
    accessToken = (verified.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    if (impactTenantId) {
      await prisma.outboxEvent.deleteMany({
        where: { tenantId: impactTenantId },
      });
      await prisma.tenantAuditLog.deleteMany({
        where: { tenantId: impactTenantId },
      });
      await prisma.tenantModule.deleteMany({
        where: { tenantId: impactTenantId },
      });
      await prisma.tenantSettings.deleteMany({
        where: { tenantId: impactTenantId },
      });
      await prisma.tenantSubscription.deleteMany({
        where: { tenantId: impactTenantId },
      });
      await prisma.tenant.delete({ where: { id: impactTenantId } });
    }
    if (createdPlanId) {
      await prisma.subscriptionPlanCapability.deleteMany({
        where: { planId: createdPlanId },
      });
      await prisma.subscriptionPlanModule.deleteMany({
        where: { planId: createdPlanId },
      });
      await prisma.subscriptionPlan.delete({ where: { id: createdPlanId } });
    }
    await prisma.systemAuditLog.deleteMany({
      where: { actorPlatformUserId: platformUserId },
    });
    await prisma.platformRefreshToken.deleteMany({
      where: { session: { platformUserId } },
    });
    await prisma.platformSession.deleteMany({
      where: { platformUserId },
    });
    await prisma.platformUser.delete({ where: { id: platformUserId } });
    await app.close();
    await prisma.$disconnect();
    await pool.end();
  });

  it('groups Attendance capabilities and separates coming-soon products', async () => {
    const response = await request(app.getHttpServer())
      .get('/platform/catalog')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const products = (response.body as { data: Array<Record<string, unknown>> })
      .data;
    const attendance = products.find(({ key }) => key === 'ATTENDANCE') as {
      availability: string;
      capabilities: Array<{ key: string }>;
      addOns: Array<{ key: string }>;
    };
    expect(attendance.availability).toBe('AVAILABLE');
    expect(attendance.capabilities.map(({ key }) => key)).toContain(
      'ATTENDANCE_REGULARIZATION',
    );
    expect(attendance.capabilities.map(({ key }) => key)).toContain(
      'ATTENDANCE_LEAVE',
    );
    expect(attendance.addOns.map(({ key }) => key)).toEqual(['FIELD_TRACKING']);
    expect(products.some(({ key }) => key === 'REGULARIZATION')).toBe(false);
    expect(products.some(({ key }) => key === 'LEAVE')).toBe(false);
    expect(
      products
        .filter(({ availability }) => availability === 'COMING_SOON')
        .map(({ key }) => key),
    ).toContain('PAYROLL');
  });

  it('rejects a dependent feature without its add-on and auto-includes transitive dependencies', async () => {
    const base = {
      name: `Catalog Plan ${stamp}`,
      description: 'Dependency-safe catalog acceptance plan',
      pricePerUser: '199.00',
      currency: 'INR',
      maxEmployees: 100,
      billingPeriod: 'MONTHLY',
    };
    const rejected = await request(app.getHttpServer())
      .post('/platform/plans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...base,
        moduleKeys: ['ATTENDANCE'],
        capabilityKeys: ['ATTENDANCE_FIELD_TRACKING'],
      })
      .expect(422);
    expect(rejected.body).toMatchObject({
      code: 'CAPABILITY_PARENT_REQUIRED',
    });

    const created = await request(app.getHttpServer())
      .post('/platform/plans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...base,
        moduleKeys: ['ATTENDANCE'],
        capabilityKeys: ['ATTENDANCE_REPORTS_ADVANCED'],
      })
      .expect(201);
    createdPlanId = (created.body as { data: { id: string } }).data.id;
    const capabilityKeys = (
      created.body as {
        data: { capabilities: Array<{ capability: { key: string } }> };
      }
    ).data.capabilities.map(({ capability }) => capability.key);
    expect(capabilityKeys).toEqual(
      expect.arrayContaining([
        'ATTENDANCE_CORE',
        'ATTENDANCE_REPORTS_BASIC',
        'ATTENDANCE_REPORTS_ADVANCED',
      ]),
    );

    impactTenantId = (
      await prisma.tenant.create({
        data: {
          companyName: `Impact Tenant ${stamp}`,
          subdomain: `catalog-impact-${stamp}`,
          status: 'ACTIVE',
        },
      })
    ).id;
    await prisma.tenantSubscription.create({
      data: {
        tenantId: impactTenantId,
        planId: createdPlanId,
        status: 'ACTIVE',
        seatCount: 20,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const reducedBundle = {
      moduleKeys: ['ATTENDANCE'],
      capabilityKeys: ['ATTENDANCE_REPORTS_BASIC'],
    };
    const impact = await request(app.getHttpServer())
      .post(`/platform/plans/${createdPlanId}/impact`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(reducedBundle)
      .expect(201);
    const impactBody = impact.body as {
      data: { affectedTenantCount: number; removedCapabilityKeys: string[] };
    };
    expect(impactBody.data).toMatchObject({
      affectedTenantCount: 1,
      removedCapabilityKeys: ['ATTENDANCE_REPORTS_ADVANCED'],
    });
    const blockedUpdate = await request(app.getHttpServer())
      .patch(`/platform/plans/${createdPlanId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(reducedBundle)
      .expect(409);
    expect((blockedUpdate.body as { code: string }).code).toBe(
      'PLAN_CHANGE_IMPACT_REQUIRED',
    );
    await request(app.getHttpServer())
      .patch(`/platform/plans/${createdPlanId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...reducedBundle, impactAcknowledged: true })
      .expect(200);
  });

  it('replaces sellable entitlements without legacy modules causing a conflict', async () => {
    const modules = await prisma.module.findMany({
      where: {
        key: { in: ['ATTENDANCE', 'FIELD_TRACKING', 'REGULARIZATION'] },
      },
    });
    for (const module of modules) {
      await prisma.tenantModule.upsert({
        where: {
          tenantId_moduleId: { tenantId: impactTenantId, moduleId: module.id },
        },
        create: {
          tenantId: impactTenantId,
          moduleId: module.id,
          isActive: true,
        },
        update: { isActive: true },
      });
    }

    await request(app.getHttpServer())
      .put(`/platform/tenants/${impactTenantId}/modules`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moduleKeys: ['ATTENDANCE'] })
      .expect(200);

    const activeKeys = (
      await prisma.tenantModule.findMany({
        where: { tenantId: impactTenantId, isActive: true },
        include: { module: true },
      })
    )
      .map(({ module }) => module.key)
      .sort();
    expect(activeKeys).toEqual(['ATTENDANCE', 'REGULARIZATION']);
  });
});

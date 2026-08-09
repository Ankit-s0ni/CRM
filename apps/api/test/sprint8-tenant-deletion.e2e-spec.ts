import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DeletionJobStatus,
  PlatformRole,
  PrismaClient,
  TenantStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { PlatformApiModule } from '../src/composition/platform-api.module';
import { generateTotp } from '../src/platform/control-plane/platform-auth/totp';

describe('Platform tenant deletion handoff (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;

  const stamp = Date.now();
  const platformEmail = `deletion-owner-${stamp}@deltcrm.test`;
  const platformPassword = 'DeletionOwner123!';
  const platformMfaSecret = 'JBSWY3DPEHPK3PXP';
  let accessToken = '';
  let platformUserId = '';
  let tenantId = '';
  let jobId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleFixture = await Test.createTestingModule({
      imports: [PlatformApiModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();

    pool = new Pool({
      connectionString:
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    platformUserId = (
      await prisma.platformUser.create({
        data: {
          email: platformEmail,
          passwordHash: await argon2.hash(platformPassword),
          role: PlatformRole.SUPER_ADMIN,
          mfaSecret: platformMfaSecret,
          mfaEnabled: true,
        },
      })
    ).id;
    tenantId = (
      await prisma.tenant.create({
        data: {
          companyName: `Deletion Handoff ${stamp}`,
          subdomain: `deletion-handoff-${stamp}`,
          status: TenantStatus.ACTIVE,
        },
      })
    ).id;

    const login = await request(app.getHttpServer())
      .post('/platform/auth/login')
      .send({ email: platformEmail, password: platformPassword })
      .expect(200);
    const mfa = await request(app.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .send({
        challengeToken: (login.body as { challengeToken: string })
          .challengeToken,
        code: generateTotp(platformMfaSecret),
      })
      .expect(200);
    accessToken = (mfa.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.outboxEvent.deleteMany({ where: { tenantId } });
    await prisma.systemAuditLog.deleteMany({ where: { tenantId } });
    await prisma.tenantDeletionJob.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.systemAuditLog.deleteMany({
      where: { actorPlatformUserId: platformUserId },
    });
    await prisma.platformUser.deleteMany({ where: { id: platformUserId } });
    await app.close();
    await prisma.$disconnect();
    await pool.end();
  });

  it('suspends access and hands product deletion to HRMS through the outbox', async () => {
    const scheduled = await request(app.getHttpServer())
      .post(`/platform/tenants/${tenantId}/deletion`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-request-id', `deletion-schedule-${stamp}`)
      .send({
        reason: 'Customer contract ended and deletion was formally approved',
      })
      .expect(201);

    jobId = (scheduled.body as { data: { id: string } }).data.id;
    expect(scheduled.body).toMatchObject({
      data: { id: jobId, status: DeletionJobStatus.PENDING, tenantId },
      replayed: false,
    });
    expect(
      await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    ).toMatchObject({ status: TenantStatus.SUSPENDED });

    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        tenantId,
        eventKey: 'platform.product.deletion-requested.v1',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(event.payload).toMatchObject({
      productKey: 'HRMS',
      deletionJobId: jobId,
      requestedBy: platformUserId,
    });

    await request(app.getHttpServer())
      .post(`/platform/tenants/${tenantId}/deletion`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        reason: 'Customer contract ended and deletion was formally approved',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: { id: jobId },
          replayed: true,
        });
      });
    expect(
      await prisma.outboxEvent.count({
        where: {
          tenantId,
          eventKey: 'platform.product.deletion-requested.v1',
        },
      }),
    ).toBe(1);
  });

  it('re-enqueues a failed product deletion without purging HRMS data locally', async () => {
    await prisma.tenantDeletionJob.update({
      where: { id: jobId },
      data: {
        status: DeletionJobStatus.FAILED,
        failureCode: 'HRMS_PURGE_TIMEOUT',
      },
    });

    await request(app.getHttpServer())
      .post(`/platform/tenants/${tenantId}/deletion/${jobId}/retry`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        reason: 'HRMS is healthy again; retry the product purge handoff',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: {
            id: jobId,
            status: DeletionJobStatus.PENDING,
            failureCode: null,
          },
        });
      });

    expect(
      await prisma.outboxEvent.count({
        where: {
          tenantId,
          eventKey: 'platform.product.deletion-requested.v1',
        },
      }),
    ).toBe(2);
    expect(
      await prisma.systemAuditLog.count({
        where: {
          tenantId,
          action: {
            in: [
              'platform.tenant.deletion_scheduled',
              'platform.tenant.deletion_retry_requested',
            ],
          },
        },
      }),
    ).toBe(2);
  });
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DevicePlatform,
  PaymentGateway,
  PaymentMethodType,
  PlatformRole,
  PrismaClient,
  SubscriptionStatus,
  TenantStatus,
  WorkType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { generateTotp } from '../src/modules/platform/platform-auth/totp';
import { TenantDeletionService } from '../src/modules/platform/tenants/tenant-deletion.service';

describe('Sprint 8 tenant deletion and biometric purge (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let prisma: PrismaClient;
  let pool: Pool;
  let deletion: TenantDeletionService;

  const stamp = Date.now();
  const platformEmail = `deletion-owner-${stamp}@deltcrm.test`;
  const platformPassword = 'DeletionOwner123!';
  const platformMfaSecret = 'JBSWY3DPEHPK3PXP';
  let accessToken = '';
  let platformUserId = '';
  let tenantId = '';
  let userId = '';
  let employeeId = '';
  let departmentId = '';
  let enrollmentId = '';
  let paymentMethodId = '';
  let subscriptionId = '';
  let jobId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    deletion = moduleFixture.get(TenantDeletionService);

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

    const plan = await prisma.subscriptionPlan.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { pricePerUser: 'asc' },
    });
    const tenant = await prisma.tenant.create({
      data: {
        companyName: `Deletion Acceptance ${stamp}`,
        subdomain: `deletion-acceptance-${stamp}`,
        status: TenantStatus.ACTIVE,
      },
    });
    tenantId = tenant.id;
    departmentId = (
      await prisma.department.create({
        data: { tenantId, name: 'Deletion fixture' },
      })
    ).id;
    userId = (
      await prisma.user.create({
        data: {
          tenantId,
          email: `employee-${stamp}@deltcrm.test`,
          phone: '+96890000000',
          passwordHash: await argon2.hash('Employee123!'),
        },
      })
    ).id;
    employeeId = (
      await prisma.employee.create({
        data: {
          tenantId,
          userId,
          employeeCode: `DEL-${stamp}`,
          fullName: 'Deletion Employee',
          phone: '+96890000000',
          workType: WorkType.FIELD,
          dateOfJoining: new Date('2026-01-01T00:00:00.000Z'),
          deptId: departmentId,
          masterSelfie: `private/${tenantId}/biometrics/${userId}/legacy.jpg`,
          faceEmbeddingRef: 'embedding-sensitive-reference',
          faceEnrolledAt: new Date(),
          faceEnrolledBy: userId,
        },
      })
    ).id;
    enrollmentId = (
      await prisma.faceEnrollment.create({
        data: {
          tenantId,
          employeeId,
          version: 1,
          privateObjectKey: `private/${tenantId}/biometrics/${employeeId}/enrollment.jpg`,
          embeddingRef: 'provider-embedding-sensitive-reference',
          livenessProvider: 'ACCEPTANCE_PROVIDER',
          enrolledBy: userId,
        },
      })
    ).id;
    await prisma.biometricConsent.create({
      data: {
        tenantId,
        employeeId,
        policyVersion: 'v1.0',
        consentIp: '192.0.2.10',
        consentUserAgent: 'acceptance-device',
      },
    });
    await prisma.registeredDevice.create({
      data: {
        tenantId,
        employeeId,
        deviceUuid: `deletion-device-${stamp}`,
        platform: DevicePlatform.ANDROID,
        pushToken: 'sensitive-push-token',
        lastIp: '192.0.2.11',
      },
    });
    subscriptionId = (
      await prisma.tenantSubscription.create({
        data: {
          tenantId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          seatCount: 1,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
          provider: PaymentGateway.RAZORPAY,
          providerCustomerRef: `customer-${stamp}`,
          providerSubscriptionRef: `subscription-${stamp}`,
        },
      })
    ).id;
    paymentMethodId = (
      await prisma.billingPaymentMethod.create({
        data: {
          tenantId,
          gateway: PaymentGateway.RAZORPAY,
          providerMethodRef: `method-${stamp}`,
          methodType: PaymentMethodType.CARD,
          displayName: 'Sensitive card',
          lastFour: '8181',
          expiryMonth: 12,
          expiryYear: 2032,
          isDefault: true,
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.systemAuditLog.deleteMany({ where: { tenantId } });
    await prisma.tenantDeletionJob.deleteMany({ where: { tenantId } });
    await prisma.billingPaymentMethod.deleteMany({ where: { tenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.registeredDevice.deleteMany({ where: { tenantId } });
    await prisma.faceEnrollment.deleteMany({ where: { tenantId } });
    await prisma.biometricConsent.deleteMany({ where: { tenantId } });
    await prisma.employee.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.department.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.systemAuditLog.deleteMany({
      where: { actorPlatformUserId: platformUserId },
    });
    await prisma.platformUser.deleteMany({ where: { id: platformUserId } });
    await app.close();
    await prisma.$disconnect();
    await pool.end();
  });

  it('honors legal hold, then purges private data with retained evidence', async () => {
    const scheduled = await request(app.getHttpServer())
      .post(`/platform/tenants/${tenantId}/deletion`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-request-id', `deletion-schedule-${stamp}`)
      .send({
        reason: 'Customer contract ended and deletion was formally approved',
        legalHoldUntil: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);
    jobId = (scheduled.body as { data: { id: string } }).data.id;
    expect(scheduled.body).toMatchObject({
      data: { status: 'LEGAL_HOLD', tenantId },
      replayed: false,
    });
    await expect(deletion.processNext()).resolves.toBeNull();
    expect(
      await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    ).toMatchObject({ status: TenantStatus.SUSPENDED });

    await prisma.tenantDeletionJob.update({
      where: { id: jobId },
      data: { status: 'PENDING', legalHoldUntil: new Date(Date.now() - 1000) },
    });
    await expect(deletion.processNext()).resolves.toMatchObject({
      data: { id: jobId, status: 'COMPLETED' },
    });

    const [job, tenant, user, employee, enrollment, method, subscription] =
      await Promise.all([
        prisma.tenantDeletionJob.findUniqueOrThrow({ where: { id: jobId } }),
        prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
        prisma.user.findUniqueOrThrow({ where: { id: userId } }),
        prisma.employee.findUniqueOrThrow({ where: { id: employeeId } }),
        prisma.faceEnrollment.findUniqueOrThrow({
          where: { id: enrollmentId },
        }),
        prisma.billingPaymentMethod.findUniqueOrThrow({
          where: { id: paymentMethodId },
        }),
        prisma.tenantSubscription.findUniqueOrThrow({
          where: { id: subscriptionId },
        }),
      ]);
    expect(job).toMatchObject({
      status: 'COMPLETED',
      biometricPurgedAt: expect.any(Date) as Date,
      completedAt: expect.any(Date) as Date,
      failureCode: null,
    });
    expect(job.evidence).toMatchObject({
      policy: 'DELTCRM_TENANT_DELETION_V1',
      biometricObjectsPurged: 1,
      usersAnonymized: 1,
      employeesAnonymized: 1,
      rawLocationDataPurged: true,
      billingAndAuditRetention: true,
      evidenceHash: expect.stringMatching(/^[a-f0-9]{64}$/) as string,
    });
    expect(tenant).toMatchObject({ status: TenantStatus.CHURNED });
    expect(user).toMatchObject({
      status: 'DISABLED',
      phone: null,
      mfaSecret: null,
      lastLoginIp: null,
    });
    expect(user.email).toBe(`deleted+${userId}@invalid.deltcrm`);
    expect(employee).toMatchObject({
      status: 'TERMINATED',
      phone: null,
      masterSelfie: null,
      faceEmbeddingRef: null,
    });
    expect(enrollment).toMatchObject({
      status: 'REVOKED',
      privateObjectKey: `purged/${enrollmentId}`,
      embeddingRef: `purged/${enrollmentId}`,
      livenessProvider: 'PURGED',
    });
    expect(method).toMatchObject({
      status: 'REVOKED',
      displayName: 'Deleted payment method',
      lastFour: null,
      isDefault: false,
    });
    expect(subscription).toMatchObject({
      status: SubscriptionStatus.CANCELLED,
      providerCustomerRef: null,
      providerSubscriptionRef: null,
    });
    expect(
      await prisma.systemAuditLog.count({
        where: {
          tenantId,
          action: {
            in: [
              'platform.tenant.deletion_scheduled',
              'platform.tenant.deletion_completed',
            ],
          },
        },
      }),
    ).toBe(2);

    await request(app.getHttpServer())
      .get(`/platform/tenants/${tenantId}/deletion`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: { id: string; status: string };
        };
        expect(body.data).toMatchObject({ id: jobId, status: 'COMPLETED' });
      });
  });
});

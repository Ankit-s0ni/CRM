import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  BillingPeriod,
  PaymentGateway,
  PaymentMethodType,
  PaymentStatus,
  PlatformRole,
  PrismaClient,
  SubscriptionStatus,
  TenantStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { createHmac } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { BillingService } from '../src/modules/billing/application/billing.service';
import { DunningService } from '../src/modules/billing/application/dunning.service';
import { synchronizeSubscriptionSeats } from '../src/modules/billing/application/seat-sync';
import { PlanChangeTiming } from '../src/modules/billing/presentation/billing.dto';
import { AuthService } from '../src/modules/identity/auth.service';
import { generateTotp } from '../src/modules/platform/platform-auth/totp';
import { PrismaService } from '../src/shared/database/prisma.service';
import { TenantContextService } from '../src/shared/tenancy/tenant-context.service';

describe('Sprint 8 billing GA acceptance (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let prisma: PrismaClient;
  let pool: Pool;
  let billing: BillingService;
  let dunning: DunningService;
  let auth: AuthService;
  let tenantPrisma: PrismaService;

  const stamp = Date.now();
  const webhookSecret = `sprint8-webhook-${stamp}`;
  const platformEmail = `sprint8-owner-${stamp}@deltcrm.test`;
  const platformPassword = 'PlatformOwner123!';
  const platformMfaSecret = 'JBSWY3DPEHPK3PXP';
  const eventIds = {
    failed: `sprint8-failed-${stamp}`,
    recovered: `sprint8-recovered-${stamp}`,
    outOfOrder: `sprint8-out-of-order-${stamp}`,
    journeyPaid: `sprint8-journey-paid-${stamp}`,
  };

  let platformUserId = '';
  let temporaryPlanId = '';
  let lifecycleTenantId = '';
  let lifecycleSubscriptionId = '';
  let lifecycleInvoiceId = '';
  let tenantAccessToken = '';
  let platformAccessToken = '';
  let addedPaymentMethodId = '';
  let journeyTenantId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();

    pool = new Pool({
      connectionString:
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    billing = moduleFixture.get(BillingService);
    dunning = moduleFixture.get(DunningService);
    auth = moduleFixture.get(AuthService);
    tenantPrisma = moduleFixture.get(PrismaService);

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

    const tenantLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-workspace-subdomain', 'acme')
      .send({ email: 'admin@acme.com', password: 'TenantAdmin123!' })
      .expect(200);
    tenantAccessToken = (tenantLogin.body as { accessToken: string })
      .accessToken;

    const platformLogin = await request(app.getHttpServer())
      .post('/platform/auth/login')
      .send({ email: platformEmail, password: platformPassword })
      .expect(200);
    const platformMfa = await request(app.getHttpServer())
      .post('/platform/auth/mfa/verify')
      .send({
        challengeToken: (platformLogin.body as { challengeToken: string })
          .challengeToken,
        code: generateTotp(platformMfaSecret),
      })
      .expect(200);
    platformAccessToken = (platformMfa.body as { accessToken: string })
      .accessToken;
  });

  afterAll(async () => {
    if (!prisma) return;

    if (addedPaymentMethodId) {
      await prisma.billingPaymentMethod.deleteMany({
        where: { id: addedPaymentMethodId },
      });
    }
    if (temporaryPlanId) {
      await prisma.subscriptionPlanCapability.deleteMany({
        where: { planId: temporaryPlanId },
      });
      await prisma.subscriptionPlanModule.deleteMany({
        where: { planId: temporaryPlanId },
      });
      await prisma.subscriptionPlan.deleteMany({
        where: { id: temporaryPlanId },
      });
    }
    if (lifecycleTenantId) {
      await prisma.paymentTransaction.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.tenantInvoiceLineItem.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.tenantInvoice.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.dunningTransition.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.tenantSubscriptionHistory.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.tenantSubscription.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.billingPaymentMethod.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.outboxEvent.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.tenantAuditLog.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.systemAuditLog.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.tenantBillingProfile.deleteMany({
        where: { tenantId: lifecycleTenantId },
      });
      await prisma.tenant.deleteMany({ where: { id: lifecycleTenantId } });
    }
    if (journeyTenantId) {
      const users = await prisma.user.findMany({
        where: { tenantId: journeyTenantId },
        select: { id: true },
      });
      const roles = await prisma.role.findMany({
        where: { tenantId: journeyTenantId },
        select: { id: true },
      });
      const userIds = users.map(({ id }) => id);
      const roleIds = roles.map(({ id }) => id);

      await prisma.paymentTransaction.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.tenantInvoiceLineItem.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.tenantInvoice.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.dunningTransition.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.tenantSubscriptionHistory.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.billingPaymentMethod.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.tenantSubscription.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.tenantModule.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.outboxEvent.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.tenantAuditLog.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.systemAuditLog.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.verificationToken.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.loginAttempt.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.rolePermission.deleteMany({
        where: { roleId: { in: roleIds } },
      });
      await prisma.user.deleteMany({ where: { tenantId: journeyTenantId } });
      await prisma.role.deleteMany({ where: { tenantId: journeyTenantId } });
      await prisma.policyAssignment.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.attendancePolicy.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.shift.deleteMany({ where: { tenantId: journeyTenantId } });
      await prisma.tenantSettings.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.tenantBillingProfile.deleteMany({
        where: { tenantId: journeyTenantId },
      });
      await prisma.tenant.deleteMany({ where: { id: journeyTenantId } });
    }
    await prisma.billingWebhookReceipt.deleteMany({
      where: { providerEventId: { in: Object.values(eventIds) } },
    });
    await prisma.systemAuditLog.deleteMany({
      where: { actorPlatformUserId: platformUserId },
    });
    await prisma.platformUser.deleteMany({ where: { id: platformUserId } });

    await app.close();
    await prisma.$disconnect();
    await pool.end();
  });

  it('completes signup, onboarding, subscription payment, and invoice retrieval as one tenant journey', async () => {
    const subdomain = `sprint8-ga-${stamp}`;
    const email = `sprint8-ga-${stamp}@deltcrm.test`;
    const password = 'TenantJourney123!';
    const signup = await auth.signup({
      companyName: `Sprint 8 GA ${stamp}`,
      workEmail: email,
      password,
      subdomain,
      employeeCount: '1 employee',
    });
    journeyTenantId = signup.tenantId;
    expect(signup.debugVerificationToken).toMatch(/^\d{6}$/);

    await request(app.getHttpServer())
      .post('/auth/verify')
      .set('x-tenant-id', journeyTenantId)
      .send({
        token: signup.debugVerificationToken,
        type: 'EMAIL_VERIFY',
      })
      .expect(200);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-workspace-subdomain', subdomain)
      .send({ email, password })
      .expect(200);
    const accessToken = (login.body as { accessToken: string }).accessToken;
    const tenantHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'x-tenant-id': journeyTenantId,
    };

    await request(app.getHttpServer())
      .post('/onboarding/complete')
      .set(tenantHeaders)
      .send({ progress: { source: 'sprint8-ga-acceptance', step: 4 } })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({ data: { completed: true } });
      });
    await request(app.getHttpServer())
      .post('/onboarding/complete')
      .set(tenantHeaders)
      .send({ progress: { source: 'idempotency-replay' } })
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({ data: { completed: true } });
      });

    await request(app.getHttpServer())
      .patch('/billing/profile')
      .set(tenantHeaders)
      .send({
        legalName: `Sprint 8 GA ${stamp} Private Limited`,
        billingEmail: email,
        gstin: '27ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        currency: 'INR',
        address: {
          line1: 'Release Gate Office',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          countryCode: 'IN',
        },
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/billing/payment-methods')
      .set(tenantHeaders)
      .send({
        gateway: 'RAZORPAY',
        providerMethodRef: `pm_sprint8_journey_${stamp}`,
        methodType: 'CARD',
        displayName: 'GA acceptance card',
        lastFour: '4242',
        expiryMonth: 12,
        expiryYear: 2032,
        isDefault: true,
      })
      .expect(201);

    const paidPlan = await prisma.subscriptionPlan.findFirstOrThrow({
      where: { isActive: true, currency: 'INR', pricePerUser: { gt: 0 } },
      orderBy: { pricePerUser: 'asc' },
    });
    const planChange = await request(app.getHttpServer())
      .post('/billing/subscription/change-plan')
      .set(tenantHeaders)
      .send({ planId: paidPlan.id, effective: 'NOW', confirm: true })
      .expect(201);
    const issuedInvoice = (
      planChange.body as {
        data: {
          committed: boolean;
          invoice: {
            id: string;
            invoiceNumber: string;
            status: string;
            totalAmount: string;
            pdfChecksum: string;
          };
        };
      }
    ).data;
    expect(issuedInvoice).toMatchObject({
      committed: true,
      invoice: {
        invoiceNumber: expect.stringMatching(/^DCRM\//) as string,
        status: 'OPEN',
        pdfChecksum: expect.stringMatching(/^[a-f0-9]{64}$/) as string,
      },
    });
    expect(Number(issuedInvoice.invoice.totalAmount)).toBeGreaterThan(0);

    const paidPayload = razorpayPayload(
      eventIds.journeyPaid,
      issuedInvoice.invoice.id,
      'captured',
    );
    await sendRazorpay(paidPayload, eventIds.journeyPaid, 200);

    await request(app.getHttpServer())
      .get(`/billing/invoices/${issuedInvoice.invoice.id}`)
      .set(tenantHeaders)
      .expect(200)
      .expect((response) => {
        const invoice = (response.body as { data: Record<string, unknown> })
          .data;
        expect(invoice).toMatchObject({
          id: issuedInvoice.invoice.id,
          invoiceNumber: issuedInvoice.invoice.invoiceNumber,
          status: 'PAID',
          currency: 'INR',
          pdfChecksum: issuedInvoice.invoice.pdfChecksum,
          paidAt: expect.any(String) as string,
          lineItems: expect.any(Array) as unknown[],
        });
      });
    await request(app.getHttpServer())
      .get(`/billing/invoices/${issuedInvoice.invoice.id}/download`)
      .set(tenantHeaders)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          data: {
            url: expect.stringMatching(/^memory:\/\//) as string,
            expiresIn: 900,
          },
        });
      });
  });

  it('serves protected tenant billing profile, subscription, and payment-method operations', async () => {
    const auth = { Authorization: `Bearer ${tenantAccessToken}` };
    const workspace = { 'x-workspace-subdomain': 'acme' };

    await request(app.getHttpServer())
      .get('/billing/profile')
      .set(auth)
      .set(workspace)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: { legalName: string; currency: string };
        };
        expect(body.data).toMatchObject({
          legalName: expect.any(String) as string,
          currency: 'INR',
        });
        expect(body.data.legalName).not.toHaveLength(0);
      });

    await request(app.getHttpServer())
      .get('/billing/subscription')
      .set(auth)
      .set(workspace)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: {
            status: string;
            usage: { activeEmployees: number; seats: number };
          };
        };
        expect(body.data).toMatchObject({
          status: expect.stringMatching(/TRIALING|ACTIVE|PAST_DUE/) as string,
          usage: {
            activeEmployees: expect.any(Number) as number,
            seats: expect.any(Number) as number,
          },
        });
      });

    const added = await request(app.getHttpServer())
      .post('/billing/payment-methods')
      .set(auth)
      .set(workspace)
      .send({
        gateway: 'RAZORPAY',
        providerMethodRef: `pm_sprint8_${stamp}`,
        methodType: 'CARD',
        displayName: 'Sprint 8 acceptance card',
        lastFour: '8181',
        expiryMonth: 12,
        expiryYear: 2032,
      })
      .expect(201);
    addedPaymentMethodId = (added.body as { data: { id: string } }).data.id;

    await request(app.getHttpServer())
      .get('/billing/payment-methods')
      .set(auth)
      .set(workspace)
      .expect(200)
      .expect((response) => {
        const body = response.body as { data: Array<{ id: string }> };
        expect(body.data.some(({ id }) => id === addedPaymentMethodId)).toBe(
          true,
        );
      });

    await request(app.getHttpServer())
      .delete(`/billing/payment-methods/${addedPaymentMethodId}`)
      .set(auth)
      .set(workspace)
      .expect(200)
      .expect((response) => {
        const body = response.body as { data: { status: string } };
        expect(body.data).toMatchObject({ status: 'REVOKED' });
      });
  });

  it('protects platform plan and billing operations with a fresh MFA session', async () => {
    const auth = { Authorization: `Bearer ${platformAccessToken}` };
    const attendance = await prisma.module.findUniqueOrThrow({
      where: { key: 'ATTENDANCE' },
    });

    const created = await request(app.getHttpServer())
      .post('/platform/plans')
      .set(auth)
      .set('x-request-id', `sprint8-plan-create-${stamp}`)
      .send({
        name: `Sprint 8 Acceptance ${stamp}`,
        description: 'Temporary acceptance plan',
        pricePerUser: '19.50',
        currency: 'INR',
        maxEmployees: 25,
        billingPeriod: BillingPeriod.MONTHLY,
        moduleKeys: [attendance.key],
      })
      .expect(201);
    temporaryPlanId = (created.body as { data: { id: string } }).data.id;

    await request(app.getHttpServer())
      .patch(`/platform/plans/${temporaryPlanId}`)
      .set(auth)
      .set('x-request-id', `sprint8-plan-update-${stamp}`)
      .send({ pricePerUser: '21.00', maxEmployees: 30 })
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: { id: string; pricePerUser: string; maxEmployees: number };
        };
        expect(body.data).toMatchObject({
          id: temporaryPlanId,
          pricePerUser: '21',
          maxEmployees: 30,
        });
      });

    await request(app.getHttpServer())
      .get('/platform/dashboard/billing')
      .set(auth)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          data: {
            revenueByCurrency: unknown[];
            outstanding: string;
            failedPaymentsThisMonth: number;
            recentSubscriptions: unknown[];
          };
        };
        expect(body.data).toMatchObject({
          revenueByCurrency: expect.any(Array) as unknown[],
          outstanding: expect.any(String) as string,
          failedPaymentsThisMonth: expect.any(Number) as number,
          recentSubscriptions: expect.any(Array) as unknown[],
        });
      });
    await request(app.getHttpServer())
      .get('/platform/invoices')
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform/payment-transactions')
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform/dunning')
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform/health/payment-providers')
      .set(auth)
      .expect(200);
  });

  it('synchronizes employee seats exactly once for an idempotency event', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { subdomain: 'acme' },
    });
    const subscription = await prisma.tenantSubscription.findFirstOrThrow({
      where: {
        tenantId: tenant.id,
        status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
      },
    });
    const sourceEventId = `sprint8-seat-sync-${stamp}`;
    const activeEmployees = await prisma.employee.count({
      where: { tenantId: tenant.id, status: 'ACTIVE' },
    });

    try {
      const first = await TenantContextService.run(
        { tenantId: tenant.id },
        () =>
          tenantPrisma.forTenant((tx) =>
            synchronizeSubscriptionSeats(tx, tenant.id, sourceEventId),
          ),
      );
      const replay = await TenantContextService.run(
        { tenantId: tenant.id },
        () =>
          tenantPrisma.forTenant((tx) =>
            synchronizeSubscriptionSeats(tx, tenant.id, sourceEventId),
          ),
      );
      expect(first).toEqual({ seatCount: activeEmployees, replayed: false });
      expect(replay).toEqual({ seatCount: activeEmployees, replayed: true });
      expect(
        await prisma.tenantSubscriptionHistory.count({
          where: { tenantId: tenant.id, sourceEventId },
        }),
      ).toBe(1);
    } finally {
      await prisma.tenantSubscriptionHistory.deleteMany({
        where: { tenantId: tenant.id, sourceEventId },
      });
      await prisma.outboxEvent.deleteMany({
        where: {
          tenantId: tenant.id,
          eventKey: 'billing.subscription.seats_synchronized',
          payload: { path: ['sourceEventId'], equals: sourceEventId },
        },
      });
      await prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: { seatCount: subscription.seatCount },
      });
    }
  });

  it('verifies signed webhook replay/conflict and recovers a billing-suspended tenant', async () => {
    const plan = await prisma.subscriptionPlan.findFirstOrThrow({
      where: { isActive: true, currency: 'INR' },
      orderBy: { pricePerUser: 'asc' },
    });
    const tenant = await prisma.tenant.create({
      data: {
        companyName: `Sprint 8 Lifecycle ${stamp}`,
        subdomain: `sprint8-lifecycle-${stamp}`,
        status: TenantStatus.ACTIVE,
        billingProfile: {
          create: {
            legalName: `Sprint 8 Lifecycle ${stamp}`,
            billingEmail: `billing-${stamp}@deltcrm.test`,
            currency: 'INR',
            gstin: '27ABCDE1234F1Z5',
            pan: 'ABCDE1234F',
            address: {
              line1: 'Acceptance Office',
              city: 'Mumbai',
              state: 'Maharashtra',
              postalCode: '400001',
              countryCode: 'IN',
            },
          },
        },
        subscriptions: {
          create: {
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            seatCount: 1,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
          },
        },
        paymentMethods: {
          create: {
            gateway: PaymentGateway.RAZORPAY,
            providerMethodRef: `pm_outage_${stamp}`,
            methodType: PaymentMethodType.CARD,
            displayName: 'Outage acceptance card',
            lastFour: '8181',
            isDefault: true,
          },
        },
      },
      include: { subscriptions: true },
    });
    lifecycleTenantId = tenant.id;
    lifecycleSubscriptionId = tenant.subscriptions[0].id;

    const issuedInvoices = await TenantContextService.run(
      { tenantId: lifecycleTenantId },
      () =>
        Promise.all(
          Array.from({ length: 4 }, (_, index) =>
            billing.issueInvoice(
              lifecycleSubscriptionId,
              `Sprint 8 lifecycle acceptance ${index + 1}`,
              10_000n + BigInt(index),
            ),
          ),
        ),
    );
    const issued = issuedInvoices[0];
    lifecycleInvoiceId = issued.data.id;
    const sequenceNumbers = issuedInvoices
      .map(({ data }) => data.sequenceNumber)
      .sort((left, right) => left - right);
    expect(new Set(sequenceNumbers).size).toBe(4);
    expect(sequenceNumbers).toEqual(
      Array.from({ length: 4 }, (_, index) => sequenceNumbers[0] + index),
    );
    expect(issued.data).toMatchObject({
      status: 'OPEN',
      pdfChecksum: expect.stringMatching(/^[a-f0-9]{64}$/) as string,
    });
    const download = await TenantContextService.run(
      { tenantId: lifecycleTenantId },
      () => billing.invoiceDownload(lifecycleInvoiceId),
    );
    expect(download.data).toMatchObject({
      url: expect.stringMatching(/^memory:\/\//) as string,
      expiresIn: 900,
    });
    await expect(
      TenantContextService.run({ tenantId: lifecycleTenantId }, () =>
        billing.changePlan(
          {
            planId: plan.id,
            effective: PlanChangeTiming.NOW,
            confirm: false,
          },
          {
            userId: '019f0000-0000-7000-8000-000000000001',
            impersonationSessionId: '019f0000-0000-7000-8000-000000000002',
          },
        ),
      ),
    ).rejects.toMatchObject({
      response: { code: 'IMPERSONATION_NOT_ALLOWED' },
    });

    const previousChargeUrl = process.env.RAZORPAY_CHARGE_URL;
    const previousApiKey = process.env.RAZORPAY_API_KEY;
    process.env.RAZORPAY_CHARGE_URL = 'http://127.0.0.1:1/unreachable';
    process.env.RAZORPAY_API_KEY = 'outage-drill-key';
    let outageResponse: request.Response;
    try {
      outageResponse = await request(app.getHttpServer())
        .post(`/platform/dunning/${lifecycleSubscriptionId}/retry`)
        .set('Authorization', `Bearer ${platformAccessToken}`)
        .set('x-request-id', `sprint8-provider-outage-${stamp}`)
        .send({
          invoiceId: lifecycleInvoiceId,
          reason: 'Sprint 8 payment provider outage acceptance drill',
        })
        .expect(201);
    } finally {
      if (previousChargeUrl === undefined)
        delete process.env.RAZORPAY_CHARGE_URL;
      else process.env.RAZORPAY_CHARGE_URL = previousChargeUrl;
      if (previousApiKey === undefined) delete process.env.RAZORPAY_API_KEY;
      else process.env.RAZORPAY_API_KEY = previousApiKey;
    }
    const outageTransaction = outageResponse.body as {
      data: { id: string; status: string; failureReason: string };
    };
    expect(outageTransaction.data).toMatchObject({
      status: PaymentStatus.FAILED,
      failureReason: 'PAYMENT_PROVIDER_UNREACHABLE',
    });
    expect(
      await prisma.systemAuditLog.count({
        where: {
          tenantId: lifecycleTenantId,
          action: 'platform.billing.payment_retried',
          newValue: {
            path: ['transactionId'],
            equals: outageTransaction.data.id,
          },
        },
      }),
    ).toBe(1);
    expect(
      await prisma.tenantAuditLog.count({
        where: {
          tenantId: lifecycleTenantId,
          action: 'billing.payment.failed',
        },
      }),
    ).toBeGreaterThanOrEqual(1);

    const failedPayload = razorpayPayload(
      eventIds.failed,
      lifecycleInvoiceId,
      'failed',
    );
    const firstFailure = await sendRazorpay(
      failedPayload,
      eventIds.failed,
      200,
    );
    expect(firstFailure.body).toMatchObject({ replayed: false });
    const replay = await sendRazorpay(failedPayload, eventIds.failed, 200);
    expect(replay.body).toMatchObject({ replayed: true });

    const conflictingPayload = {
      ...failedPayload,
      created_at: failedPayload.created_at + 1,
    };
    await sendRazorpay(conflictingPayload, eventIds.failed, 409);

    await dunning.advance(lifecycleSubscriptionId, 'acceptance');
    await dunning.advance(lifecycleSubscriptionId, 'acceptance');
    await dunning.advance(lifecycleSubscriptionId, 'acceptance');
    expect(
      await prisma.tenant.findUniqueOrThrow({
        where: { id: lifecycleTenantId },
      }),
    ).toMatchObject({ status: TenantStatus.SUSPENDED });

    const recoveredPayload = razorpayPayload(
      eventIds.recovered,
      lifecycleInvoiceId,
      'captured',
    );
    await sendRazorpay(recoveredPayload, eventIds.recovered, 200);
    const outOfOrderPayload = razorpayPayload(
      eventIds.outOfOrder,
      lifecycleInvoiceId,
      'failed',
    );
    const outOfOrder = await sendRazorpay(
      outOfOrderPayload,
      eventIds.outOfOrder,
      200,
    );
    expect(outOfOrder.body).toMatchObject({
      data: { ignoredOutOfOrder: true, invoiceStatus: 'PAID' },
    });
    expect(
      await prisma.tenant.findUniqueOrThrow({
        where: { id: lifecycleTenantId },
      }),
    ).toMatchObject({ status: TenantStatus.ACTIVE });
    expect(
      await prisma.tenantSubscription.findUniqueOrThrow({
        where: { id: lifecycleSubscriptionId },
      }),
    ).toMatchObject({
      status: SubscriptionStatus.ACTIVE,
      dunningState: 'NONE',
    });
    expect(
      await prisma.tenantInvoice.findUniqueOrThrow({
        where: { id: lifecycleInvoiceId },
      }),
    ).toMatchObject({ status: 'PAID' });
  });

  function razorpayPayload(
    eventId: string,
    invoiceId: string,
    status: 'failed' | 'captured',
  ) {
    return {
      id: eventId,
      event: status === 'captured' ? 'payment.captured' : 'payment.failed',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: `pay_${eventId}`,
            amount: 11_800,
            currency: 'INR',
            status,
            notes: { invoiceId },
            error_description:
              status === 'failed' ? 'Acceptance payment declined' : undefined,
          },
        },
      },
    };
  }

  async function sendRazorpay(
    payload: ReturnType<typeof razorpayPayload>,
    eventId: string,
    status: number,
  ) {
    const raw = JSON.stringify(payload);
    const signature = createHmac('sha256', webhookSecret)
      .update(raw)
      .digest('hex');
    return request(app.getHttpServer())
      .post('/billing/webhooks/razorpay')
      .set('content-type', 'application/json')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', eventId)
      .send(raw)
      .expect(status);
  }
});

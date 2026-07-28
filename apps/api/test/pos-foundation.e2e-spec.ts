import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/platform/identity/auth.service';
import { TenantContextService } from '../src/platform/tenancy/public';
import { TestDataFactory } from './support/factories';

type ErrorBody = { code: string };

describe('POS foundation (e2e)', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let adminPrisma: PrismaClient;
  let adminPool: Pool;
  let factory: TestDataFactory;

  let tenantId = '';
  let adminToken = '';
  let cashierToken = '';
  const stamp = `${Date.now()}-${process.pid}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    authService = moduleFixture.get(AuthService);

    adminPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    adminPrisma = new PrismaClient({ adapter: new PrismaPg(adminPool) });
    factory = new TestDataFactory(adminPrisma);

    const email = `pos-admin+${stamp}@pos.example.com`;
    const signup = await authService.signup({
      companyName: `POS Tenant ${stamp}`,
      workEmail: email,
      password: 'Start123!',
      subdomain: `pos-${stamp}`,
      employeeCount: '1-25 employees',
    });
    tenantId = signup.tenantId;
    adminToken = (await login(email, 'Start123!')).accessToken;

    // A user with no POS permissions, to prove the permission guard is independent of
    // the module guard.
    const cashierEmail = `pos-cashier+${stamp}@pos.example.com`;
    const cashier = await factory.createUser({
      tenantId,
      email: cashierEmail,
      passwordHash: await argon2.hash('Cashier123!'),
    });
    const employeeRole = await adminPrisma.role.findFirstOrThrow({
      where: { tenantId, name: 'EMPLOYEE' },
    });
    await factory.assignRole(cashier.id, employeeRole.id);
    cashierToken = (await login(cashierEmail, 'Cashier123!')).accessToken;
  });

  afterAll(async () => {
    await cleanupPosTenant(adminPrisma, tenantId);
    await app.close();
    await adminPrisma.$disconnect();
    await adminPool.end();
  });

  it('denies POS routes until the module is active for the tenant', async () => {
    const response = await api(adminToken).get('/pos/settings').expect(403);
    expect((response.body as ErrorBody).code).toBe('MODULE_ACCESS_DENIED');
  });

  it('reports POS as uninitialised once the module is active but setup has not run', async () => {
    await activatePosModule();

    const response = await api(adminToken).get('/pos/settings').expect(409);
    expect((response.body as ErrorBody).code).toBe('POS_NOT_INITIALIZED');
  });

  it('provisions tenant defaults on setup and is idempotent', async () => {
    const first = await api(adminToken).post('/pos/setup').expect(201);
    expect(
      (first.body as { alreadyInitialized: boolean }).alreadyInitialized,
    ).toBe(false);

    const [settings, sequence, outlets, taxRates, taxGroups] =
      await Promise.all([
        adminPrisma.posSettings.findUnique({ where: { tenantId } }),
        adminPrisma.posInvoiceSequence.findUnique({ where: { tenantId } }),
        adminPrisma.posOutlet.findMany({ where: { tenantId } }),
        adminPrisma.posTaxRate.findMany({ where: { tenantId } }),
        adminPrisma.posTaxGroup.findMany({ where: { tenantId } }),
      ]);

    expect(settings?.initializedAt).toBeTruthy();
    expect(settings?.invoicePrefix).toBe('INV');
    expect(sequence?.nextNumber).toBe(1);
    expect(outlets).toHaveLength(1);
    expect(outlets[0].name).toBe('Main Outlet');
    expect(taxRates).toHaveLength(4);
    expect(taxGroups).toHaveLength(4);
    expect(
      taxRates.find(({ name }) => name === 'Standard VAT 5%')?.rate.toString(),
    ).toBe('5');

    // Re-running must not duplicate anything — this is how an existing tenant is
    // backfilled.
    const second = await api(adminToken).post('/pos/setup').expect(201);
    expect(
      (second.body as { alreadyInitialized: boolean }).alreadyInitialized,
    ).toBe(true);
    expect(await adminPrisma.posTaxRate.count({ where: { tenantId } })).toBe(4);
    expect(await adminPrisma.posOutlet.count({ where: { tenantId } })).toBe(1);
  });

  it('reads and updates settings, and lists outlets', async () => {
    const read = await api(adminToken).get('/pos/settings').expect(200);
    expect(
      (read.body as { data: { taxInclusive: boolean } }).data.taxInclusive,
    ).toBe(true);

    await api(adminToken)
      .put('/pos/settings')
      .send({ vatNumber: 'OM1234567890', returnWindowDays: 14 })
      .expect(200);

    const updated = await adminPrisma.posSettings.findUniqueOrThrow({
      where: { tenantId },
    });
    expect(updated.vatNumber).toBe('OM1234567890');
    expect(updated.returnWindowDays).toBe(14);

    const outlets = await api(adminToken).get('/pos/outlets').expect(200);
    expect((outlets.body as { data: unknown[] }).data).toHaveLength(1);
  });

  it('writes an audit trail and a domain event for setup and updates', async () => {
    const actions = await adminPrisma.tenantAuditLog.findMany({
      where: { tenantId, module: 'POS' },
      select: { action: true },
    });
    expect(actions.map(({ action }) => action)).toEqual(
      expect.arrayContaining(['pos.setup.completed', 'pos.settings.updated']),
    );

    const events = await adminPrisma.outboxEvent.findMany({
      where: { tenantId, eventKey: { startsWith: 'pos.' } },
      select: { eventKey: true, payload: true },
    });
    expect(events.map(({ eventKey }) => eventKey)).toEqual(
      expect.arrayContaining([
        'pos.tenant.initialized.v1',
        'pos.settings.changed.v1',
      ]),
    );
    // POS payloads must never carry a top-level employeeId: the outbox relay forwards
    // every tenant-scoped event to the notification dispatcher, which fans out to
    // employees keyed on exactly that field.
    for (const event of events) {
      expect(event.payload).not.toHaveProperty('employeeId');
    }
  });

  it('denies a user holding no POS permissions even when the module is active', async () => {
    const response = await api(cashierToken).get('/pos/settings').expect(403);
    expect((response.body as ErrorBody).code).toBe('FORBIDDEN');
  });

  function api(token: string) {
    const server = request(app.getHttpServer());
    return {
      get: (path: string) =>
        server
          .get(path)
          .set('Authorization', `Bearer ${token}`)
          .set('x-tenant-id', tenantId),
      post: (path: string) =>
        server
          .post(path)
          .set('Authorization', `Bearer ${token}`)
          .set('x-tenant-id', tenantId),
      put: (path: string) =>
        server
          .put(path)
          .set('Authorization', `Bearer ${token}`)
          .set('x-tenant-id', tenantId),
    };
  }

  function login(email: string, password: string) {
    return TenantContextService.run({ tenantId }, () =>
      authService.login(email, password, '127.0.0.1', 'jest'),
    );
  }

  async function activatePosModule() {
    const posModule = await adminPrisma.module.findUniqueOrThrow({
      where: { key: 'POS' },
    });
    await adminPrisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId: posModule.id } },
      update: { isActive: true, activatedAt: new Date() },
      create: {
        tenantId,
        moduleId: posModule.id,
        isActive: true,
        activatedAt: new Date(),
      },
    });
  }
});

async function cleanupPosTenant(prisma: PrismaClient, tenantId: string) {
  if (!tenantId) return;
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const roles = await prisma.role.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const userIds = users.map(({ id }) => id);
  const roleIds = roles.map(({ id }) => id);

  // POS rows hold ON DELETE RESTRICT foreign keys to tenants, so they go first, and in
  // dependency order within POS itself.
  await prisma.posProductImportRow.deleteMany({ where: { tenantId } });
  await prisma.posProductImportJob.deleteMany({ where: { tenantId } });
  await prisma.posBundleComponent.deleteMany({ where: { tenantId } });
  await prisma.posBundle.deleteMany({ where: { tenantId } });
  await prisma.posVariant.deleteMany({ where: { tenantId } });
  await prisma.posProduct.deleteMany({ where: { tenantId } });
  await prisma.posCategory.deleteMany({ where: { tenantId } });
  await prisma.posUnitOfMeasure.updateMany({
    where: { tenantId },
    data: { baseUnitId: null },
  });
  await prisma.posUnitOfMeasure.deleteMany({ where: { tenantId } });
  await prisma.posTaxGroupRate.deleteMany({ where: { tenantId } });
  await prisma.posTaxGroup.deleteMany({ where: { tenantId } });
  await prisma.posTaxRate.deleteMany({ where: { tenantId } });
  await prisma.posOutlet.deleteMany({ where: { tenantId } });
  await prisma.posInvoiceSequence.deleteMany({ where: { tenantId } });
  await prisma.posSettings.deleteMany({ where: { tenantId } });

  await prisma.outboxEvent.deleteMany({ where: { tenantId } });
  await prisma.tenantAuditLog.deleteMany({ where: { tenantId } });
  await prisma.tenantModule.deleteMany({ where: { tenantId } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: roleIds } },
  });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.verificationToken.deleteMany({ where: { tenantId } });
  await prisma.loginAttempt.deleteMany({ where: { tenantId } });
  await prisma.employee.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.designation.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

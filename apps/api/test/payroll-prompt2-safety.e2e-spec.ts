import { INestApplication, LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ModuleAvailability,
  PayComponentType,
  PayComponentValueMode,
  PayrollFrequency,
  PayrollPaymentMethod,
  PrismaClient,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import request, { Test as SupertestTest } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/platform/identity/auth.service';
import { TenantContextService } from '../src/platform/tenancy/public';
import { PERMISSIONS } from '../src/shared/authorization/permissions.constants';
import { OutboxService } from '../src/shared/events/outbox.service';
import { ERROR_REPORTER } from '../src/shared/observability/observability.port';
import { TestDataFactory } from './support/factories';

type Workspace = {
  tenantId: string;
  adminUserId: string;
  accessToken: string;
};

type PayrollFixture = {
  employeeId: string;
  settingsVersion: number;
  calendarId: string;
  calendarVersionId: string;
  payGroupId: string;
  policyId: string;
  policyVersionId: string;
  componentId: string;
  componentVersionId: string;
  structureId: string;
  structureVersionId: string;
  profileId: string;
  compensationId: string;
  approvalPolicyId: string;
  approvalPolicyVersionId: string;
  accountingMappingId: string;
};

type ErrorBody = { code: string; message?: string; details?: unknown };
type EffectivePolicyBody = {
  sourceLevel: string;
  sourceEntityId: string | null;
  policyId: string | null;
  policyVersionId: string | null;
  resolvedValue: Record<string, unknown> | null;
};
type AuditBody = unknown[];
type IdBody = { id: string };

const secrets = [
  'BANK-ACCOUNT-TEST-998877',
  'IBAN-TEST-0000111122223333',
  'STATUTORY-ID-TEST-112233',
  'ROUTING-TEST-445566',
];

class FaultInjectingOutboxService extends OutboxService {
  failNextEventKey: string | null = null;

  append(
    transaction: Parameters<OutboxService['append']>[0],
    event: Parameters<OutboxService['append']>[1],
  ) {
    if (this.failNextEventKey === event.eventKey) {
      this.failNextEventKey = null;
      throw new Error('PAYROLL_TEST_ROLLBACK_FAULT');
    }
    return super.append(transaction, event);
  }
}

class CapturingLogger implements LoggerService {
  readonly entries: string[] = [];
  log(message: unknown) {
    this.entries.push(String(message));
  }
  error(message: unknown, trace?: string) {
    this.entries.push(`${String(message)} ${trace ?? ''}`);
  }
  warn(message: unknown) {
    this.entries.push(String(message));
  }
  debug(message: unknown) {
    this.entries.push(String(message));
  }
  verbose(message: unknown) {
    this.entries.push(String(message));
  }
}

describe('Payroll Prompt 2 safety gates (e2e)', () => {
  jest.setTimeout(90_000);

  let app: INestApplication<App>;
  let authService: AuthService;
  let jwtService: JwtService;
  let adminPrisma: PrismaClient;
  let adminPool: Pool;
  let factory: TestDataFactory;
  let outbox: FaultInjectingOutboxService;
  let logger: CapturingLogger;
  let sequence = 0;
  let originalPayrollAvailability: ModuleAvailability | null = null;
  let payrollModuleCreatedByTest = false;
  const tenantIds = new Set<string>();
  const capturedErrors: unknown[] = [];

  beforeAll(async () => {
    process.env.PAYROLL_DATA_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef';
    process.env.PAYROLL_DATA_KEY_VERSION = 'prompt2-test-v1';

    outbox = new FaultInjectingOutboxService();
    logger = new CapturingLogger();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OutboxService)
      .useValue(outbox)
      .overrideProvider(ERROR_REPORTER)
      .useValue({
        captureException: (error: unknown) => capturedErrors.push(error),
      })
      .compile();

    app = moduleFixture.createNestApplication<INestApplication<App>>();
    app.useLogger(logger);
    await app.init();
    authService = moduleFixture.get(AuthService);
    jwtService = moduleFixture.get(JwtService);

    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';
    adminPool = new Pool({ connectionString });
    adminPrisma = new PrismaClient({ adapter: new PrismaPg(adminPool) });
    factory = new TestDataFactory(adminPrisma);
    await ensurePayrollModuleAvailable();
  });

  afterAll(async () => {
    for (const tenantId of tenantIds) {
      await cleanupTenant(adminPrisma, tenantId);
    }
    await restorePayrollModule();
    await app.close();
    await adminPrisma.$disconnect();
    await adminPool.end();
  });

  it('blocks cross-tenant HTTP reads, mutations, and references while preserving tenant-scoped uniqueness', async () => {
    const tenantA = await createWorkspace('a');
    const tenantB = await createWorkspace('b');
    const fixtureA = await createPayrollFixture(tenantA, 'A');
    await createPayrollFixture(tenantB, 'B');

    await rawApi(tenantA.tenantId, tenantB.accessToken)
      .get('/payroll/settings')
      .expect(403);
    await rawApi(tenantA.tenantId, tenantB.accessToken)
      .patch('/payroll/settings')
      .send({ version: fixtureA.settingsVersion, locale: 'en-GB' })
      .expect(403);

    await expectNotFoundNoLeak(
      api(tenantB).get(`/payroll/calendars/${fixtureA.calendarId}`),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .patch(`/payroll/calendars/${fixtureA.calendarId}`)
        .send({ version: 1, name: 'Cross Tenant Calendar' }),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(`/payroll/calendars/${fixtureA.calendarId}/versions`)
        .send(calendarVersionPayload('Blocked')),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB).post(
        `/payroll/calendars/${fixtureA.calendarVersionId}/activate`,
      ),
      fixtureA,
      [404, 400],
    );

    await expectNotFoundNoLeak(
      api(tenantB).get(`/payroll/pay-groups/${fixtureA.payGroupId}`),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .patch(`/payroll/pay-groups/${fixtureA.payGroupId}`)
        .send({ version: 1, name: 'Cross Tenant Pay Group' }),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB).get(`/payroll/pay-groups/${fixtureA.payGroupId}/employees`),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(`/payroll/pay-groups/${fixtureA.payGroupId}/employees`)
        .send({ employeeId: fixtureA.employeeId, effectiveFrom: '2026-07-01' }),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post('/payroll/pay-groups')
        .send(payGroupPayload('B-CROSS', fixtureA.calendarId)),
      fixtureA,
    );

    await expectNotFoundNoLeak(
      api(tenantB).patch(`/payroll/policies/${fixtureA.policyId}`).send({
        version: 1,
        name: 'Cross Tenant Policy',
      }),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(`/payroll/policies/${fixtureA.policyId}/versions`)
        .send(policyVersionPayload()),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB).post(
        `/payroll/policies/${fixtureA.policyId}/versions/${fixtureA.policyVersionId}/activate`,
      ),
      fixtureA,
    );

    await expectNotFoundNoLeak(
      api(tenantB).get(`/payroll/components/${fixtureA.componentId}`),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(`/payroll/components/${fixtureA.componentId}/versions`)
        .send(componentVersionPayload()),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB).post(
        `/payroll/components/${fixtureA.componentId}/versions/${fixtureA.componentVersionId}/activate`,
      ),
      fixtureA,
    );

    await expectNotFoundNoLeak(
      api(tenantB).get(`/payroll/salary-structures/${fixtureA.structureId}`),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB).post('/payroll/salary-structures').send({
        payGroupId: fixtureA.payGroupId,
        code: 'B-CROSS-STRUCT',
        name: 'Cross Tenant Structure',
        currency: 'OMR',
      }),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(`/payroll/salary-structures/${fixtureA.structureId}/versions`)
        .send({ effectiveFrom: '2026-08-01' }),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(
          `/payroll/salary-structures/versions/${fixtureA.structureVersionId}/components`,
        )
        .send(structureComponentPayload(fixtureA.componentVersionId)),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB).post(
        `/payroll/salary-structures/${fixtureA.structureId}/versions/${fixtureA.structureVersionId}/activate`,
      ),
      fixtureA,
    );

    await expectNotFoundNoLeak(
      api(tenantB).get(`/payroll/employees/${fixtureA.employeeId}/profile`),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(`/payroll/employees/${fixtureA.employeeId}/profile`)
        .send(profilePayload(fixtureA.payGroupId)),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(`/payroll/employees/${fixtureA.employeeId}/compensation`)
        .send(compensationPayload(fixtureA.structureVersionId, '2026-08-01')),
      fixtureA,
    );

    await expectNotFoundNoLeak(
      api(tenantB).get(
        `/payroll/employees/${fixtureA.employeeId}/payment-details`,
      ),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(`/payroll/employees/${fixtureA.employeeId}/payment-details`)
        .send(paymentPayload()),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB).get(
        `/payroll/employees/${fixtureA.employeeId}/statutory-details`,
      ),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post(`/payroll/employees/${fixtureA.employeeId}/statutory-details`)
        .send(statutoryPayload()),
      fixtureA,
    );

    await expectNotFoundNoLeak(
      api(tenantB)
        .patch(`/payroll/approval-policies/${fixtureA.approvalPolicyId}`)
        .send({ version: 1, name: 'Cross Tenant Approval' }),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB).post(
        `/payroll/approval-policies/${fixtureA.approvalPolicyId}/versions/${fixtureA.approvalPolicyVersionId}/activate`,
      ),
      fixtureA,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .patch(`/payroll/accounting-mappings/${fixtureA.accountingMappingId}`)
        .send({ version: 1, debitAccountCode: '9999' }),
      fixtureA,
    );
    await api(tenantB)
      .post('/payroll/accounting-mappings')
      .send(accountingPayload(fixtureA.componentId))
      .expect(404);

    const tenantAAudit = await api(tenantA)
      .get('/payroll/audit')
      .query({ entityId: fixtureA.employeeId })
      .expect(200);
    expectNoSecrets(tenantAAudit.body);
    const crossAudit = await rawApi(tenantA.tenantId, tenantB.accessToken)
      .get('/payroll/audit')
      .query({ entityId: fixtureA.employeeId })
      .expect(403);
    expectNoSecrets(crossAudit.body);

    await api(tenantA)
      .post('/payroll/components')
      .send(componentPayload('BASIC'))
      .expect(201);
    await api(tenantB)
      .post('/payroll/components')
      .send(componentPayload('BASIC'))
      .expect(201);
    const duplicateComponent = await api(tenantB)
      .post('/payroll/components')
      .send(componentPayload('BASIC'))
      .expect(409);
    expect((duplicateComponent.body as ErrorBody).code).toBe(
      'PAY_COMPONENT_CODE_ALREADY_EXISTS',
    );

    await api(tenantA)
      .post('/payroll/calendars')
      .send(calendarPayload('DUPCAL'))
      .expect(201);
    await api(tenantB)
      .post('/payroll/calendars')
      .send(calendarPayload('DUPCAL'))
      .expect(201);
    await api(tenantB)
      .post('/payroll/calendars')
      .send(calendarPayload('DUPCAL'))
      .expect(409);
  });

  it('enforces HTTP authentication, authorization, and Payroll module entitlement', async () => {
    const workspace = await createWorkspace('auth');
    const fixture = await createPayrollFixture(workspace, 'AUTH');
    const readOnly = await createUserWithPermissions(workspace.tenantId, [
      PERMISSIONS.PAYROLL_SETTINGS_READ,
      PERMISSIONS.PAYROLL_POLICIES_READ,
      PERMISSIONS.PAYROLL_COMPONENTS_READ,
      PERMISSIONS.PAYROLL_STRUCTURES_READ,
      PERMISSIONS.PAYROLL_COMPENSATION_READ,
    ]);
    const hrNoProtected = await createUserWithPermissions(workspace.tenantId, [
      PERMISSIONS.PAYROLL_COMPENSATION_READ,
    ]);
    const protectedReader = await createUserWithPermissions(
      workspace.tenantId,
      [PERMISSIONS.PAYROLL_PROTECTED_DATA_READ],
    );
    const financeReader = await createUserWithPermissions(workspace.tenantId, [
      PERMISSIONS.PAYROLL_ACCOUNTING_READ,
    ]);
    const noAuditReader = await createUserWithPermissions(workspace.tenantId, [
      PERMISSIONS.PAYROLL_SETTINGS_READ,
    ]);

    await request(app.getHttpServer()).get('/payroll/settings').expect(401);
    await request(app.getHttpServer())
      .get('/payroll/settings')
      .set('Authorization', 'Bearer not-a-token')
      .set('x-tenant-id', workspace.tenantId)
      .expect(401);
    await request(app.getHttpServer())
      .get('/payroll/settings')
      .set('Authorization', `Bearer ${expiredToken(workspace)}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(401);

    await rawApi(workspace.tenantId, readOnly.accessToken)
      .get('/payroll/settings')
      .expect(200);
    await rawApi(workspace.tenantId, readOnly.accessToken)
      .patch('/payroll/settings')
      .send({ version: fixture.settingsVersion, locale: 'en-GB' })
      .expect(403);
    await rawApi(workspace.tenantId, readOnly.accessToken)
      .get('/payroll/calendars')
      .expect(200);
    await rawApi(workspace.tenantId, readOnly.accessToken)
      .post('/payroll/calendars')
      .send(calendarPayload('AUTHDENY'))
      .expect(403);
    await rawApi(workspace.tenantId, readOnly.accessToken)
      .get(`/payroll/employees/${fixture.employeeId}/profile`)
      .expect(200);
    await rawApi(workspace.tenantId, readOnly.accessToken)
      .post(`/payroll/employees/${fixture.employeeId}/compensation`)
      .send(compensationPayload(fixture.structureVersionId, '2027-01-01'))
      .expect(403);

    await rawApi(workspace.tenantId, hrNoProtected.accessToken)
      .get(`/payroll/employees/${fixture.employeeId}/payment-details`)
      .expect(403);
    await rawApi(workspace.tenantId, protectedReader.accessToken)
      .get(`/payroll/employees/${fixture.employeeId}/payment-details`)
      .expect(200);
    await rawApi(workspace.tenantId, protectedReader.accessToken)
      .post(`/payroll/employees/${fixture.employeeId}/payment-details`)
      .send(paymentPayload())
      .expect(403);
    await rawApi(workspace.tenantId, financeReader.accessToken)
      .get('/payroll/accounting-mappings')
      .expect(200);
    await rawApi(workspace.tenantId, financeReader.accessToken)
      .post('/payroll/accounting-mappings')
      .send(accountingPayload(fixture.componentId))
      .expect(403);
    await rawApi(workspace.tenantId, noAuditReader.accessToken)
      .get('/payroll/audit')
      .expect(403);

    const noEntitlement = await createWorkspace('noentitlement', false);
    const noEntitlementUser = await createUserWithPermissions(
      noEntitlement.tenantId,
      [
        PERMISSIONS.PAYROLL_SETTINGS_READ,
        PERMISSIONS.PAYROLL_SETTINGS_MANAGE,
        PERMISSIONS.PAYROLL_POLICIES_READ,
        PERMISSIONS.PAYROLL_POLICIES_MANAGE,
        PERMISSIONS.PAYROLL_COMPENSATION_READ,
        PERMISSIONS.PAYROLL_PROTECTED_DATA_READ,
      ],
    );
    const entitlementBlocked = await rawApi(
      noEntitlement.tenantId,
      noEntitlementUser.accessToken,
    )
      .get('/payroll/settings')
      .expect(403);
    expect((entitlementBlocked.body as ErrorBody).code).toBe(
      'MODULE_ACCESS_DENIED',
    );

    const entitlementOnly = await createUserWithPermissions(
      workspace.tenantId,
      [],
    );
    await rawApi(workspace.tenantId, entitlementOnly.accessToken)
      .get('/payroll/settings')
      .expect(403);

    const otherTenant = await createWorkspace('other');
    const otherUser = await createUserWithPermissions(otherTenant.tenantId, [
      PERMISSIONS.PAYROLL_SETTINGS_READ,
    ]);
    await rawApi(workspace.tenantId, otherUser.accessToken)
      .get('/payroll/settings')
      .expect(403);
  });

  it('rolls back real database mutations when transactional payroll commands fail', async () => {
    const workspace = await createWorkspace('rollback');
    const fixture = await createPayrollFixture(workspace, 'ROLL');

    outbox.failNextEventKey = 'payroll.calendar.created';
    const calendarBefore = await countPayrollRows(
      workspace.tenantId,
      'payrollCalendar',
    );
    const calendarAuditBefore = await auditCount(
      workspace.tenantId,
      'payroll.calendar.created',
    );
    const calendarOutboxBefore = await outboxCount(
      workspace.tenantId,
      'payroll.calendar.created',
    );
    const failedCalendar = await api(workspace)
      .post('/payroll/calendars')
      .send(calendarPayload('ROLLBACKCAL'))
      .expect(500);
    expect((failedCalendar.body as ErrorBody).code).toBe(
      'INTERNAL_SERVER_ERROR',
    );
    expect(await countPayrollRows(workspace.tenantId, 'payrollCalendar')).toBe(
      calendarBefore,
    );
    expect(
      await auditCount(workspace.tenantId, 'payroll.calendar.created'),
    ).toBe(calendarAuditBefore);
    expect(
      await outboxCount(workspace.tenantId, 'payroll.calendar.created'),
    ).toBe(calendarOutboxBefore);
    await api(workspace)
      .post('/payroll/calendars')
      .send(calendarPayload('ROLLBACKCAL'))
      .expect(201);

    outbox.failNextEventKey = 'payroll.policy.version_activated';
    const activePolicyBefore = await activePolicyVersionIds(
      workspace.tenantId,
      fixture.policyId,
    );
    const draft = await api(workspace)
      .post(`/payroll/policies/${fixture.policyId}/versions`)
      .send(policyVersionPayload('2026-09-01'))
      .expect(201);
    const draftId = bodyId(draft);
    await api(workspace)
      .post(
        `/payroll/policies/${fixture.policyId}/versions/${draftId}/activate`,
      )
      .expect(500);
    expect(
      await activePolicyVersionIds(workspace.tenantId, fixture.policyId),
    ).toEqual(activePolicyBefore);
    expect(
      await outboxCount(workspace.tenantId, 'payroll.policy.version_activated'),
    ).toBe(1);

    outbox.failNextEventKey = 'payroll.protected_payment_detail.upserted';
    const paymentBefore = await adminPrisma.employeePaymentDetail.findMany({
      where: { tenantId: workspace.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    await api(workspace)
      .post(`/payroll/employees/${fixture.employeeId}/payment-details`)
      .send(paymentPayload('ROLLBACK-BANK-123456'))
      .expect(500);
    expect(
      await adminPrisma.employeePaymentDetail.findMany({
        where: { tenantId: workspace.tenantId },
        orderBy: { createdAt: 'asc' },
      }),
    ).toEqual(paymentBefore);
    expect(
      await auditCount(
        workspace.tenantId,
        'payroll.protected_payment_detail.upserted',
      ),
    ).toBe(1);
    expectNoSecrets(await persistedPayrollDump(workspace.tenantId));
  });

  it('keeps protected plaintext out of persisted database rows, audit, outbox, responses, logs, and errors', async () => {
    const workspace = await createWorkspace('plaintext');
    const fixture = await createPayrollFixture(workspace, 'PLAIN');

    const paymentRead = await api(workspace)
      .get(`/payroll/employees/${fixture.employeeId}/payment-details`)
      .expect(200);
    const statutoryRead = await api(workspace)
      .get(`/payroll/employees/${fixture.employeeId}/statutory-details`)
      .expect(200);

    expectNoSecrets(paymentRead.body);
    expectNoSecrets(statutoryRead.body);
    expect(JSON.stringify(paymentRead.body)).not.toContain(
      'encryptionKeyVersion',
    );
    expect(JSON.stringify(statutoryRead.body)).not.toContain(
      'encryptionKeyVersion',
    );
    expect(JSON.stringify(paymentRead.body)).toContain('****8877');
    expect(JSON.stringify(statutoryRead.body)).toContain('****2233');

    const dump = await persistedPayrollDump(workspace.tenantId);
    expectNoSecrets(dump);
    expect(JSON.stringify(dump.paymentDetails)).toContain('8877');
    expect(JSON.stringify(dump.paymentDetails)).toContain('3333');
    expect(JSON.stringify(dump.paymentDetails)).toContain('5566');
    expect(JSON.stringify(dump.statutoryDetails)).toContain('2233');
    expect(JSON.stringify(dump.outbox)).not.toContain('prompt2-test-v1');
    expect(JSON.stringify(dump.outbox)).not.toContain('aes-256-gcm');

    const validationError = await api(workspace)
      .post(`/payroll/employees/${fixture.employeeId}/payment-details`)
      .send({ ...paymentPayload(), accountNumber: secrets[0].repeat(10) })
      .expect(400);
    expectNoSecrets(validationError.body);

    outbox.failNextEventKey = 'payroll.protected_statutory_detail.upserted';
    const failed = await api(workspace)
      .post(`/payroll/employees/${fixture.employeeId}/statutory-details`)
      .send(statutoryPayload('STATUTORY-ID-TEST-ERROR-9988'))
      .expect(500);
    expectNoSecrets(failed.body);
    expectNoSecrets(logger.entries);
    expectNoSecrets(capturedErrors);
  });

  it('preserves valid state under DB-backed concurrent Payroll requests', async () => {
    const workspace = await createWorkspace('concurrency');
    const fixture = await createPayrollFixture(workspace, 'CONC');

    const settingsResponses = await Promise.all([
      api(workspace).patch('/payroll/settings').send({
        version: fixture.settingsVersion,
        locale: 'en-GB',
      }),
      api(workspace).patch('/payroll/settings').send({
        version: fixture.settingsVersion,
        timezone: 'Asia/Dubai',
      }),
    ]);
    expect(settingsResponses.map(({ status }) => status).sort()).toEqual([
      200, 409,
    ]);

    const policyV2 = await api(workspace)
      .post(`/payroll/policies/${fixture.policyId}/versions`)
      .send(policyVersionPayload('2026-10-01'))
      .expect(201);
    const policyV3 = await api(workspace)
      .post(`/payroll/policies/${fixture.policyId}/versions`)
      .send(policyVersionPayload('2026-11-01'))
      .expect(201);
    expect([policyV2.status, policyV3.status]).toEqual([201, 201]);
    const activationResponses = await Promise.all([
      api(workspace).post(
        `/payroll/policies/${fixture.policyId}/versions/${bodyId(policyV2)}/activate`,
      ),
      api(workspace).post(
        `/payroll/policies/${fixture.policyId}/versions/${bodyId(policyV3)}/activate`,
      ),
    ]);
    expect(activationResponses.some(({ status }) => status === 201)).toBe(true);
    expect(
      await adminPrisma.payrollPolicyVersion.count({
        where: {
          tenantId: workspace.tenantId,
          policyId: fixture.policyId,
          status: 'ACTIVE',
        },
      }),
    ).toBe(1);

    const compensationCountBefore =
      await adminPrisma.employeeCompensationVersion.count({
        where: { tenantId: workspace.tenantId },
      });
    const compensationResponses = await Promise.all([
      api(workspace)
        .post(`/payroll/employees/${fixture.employeeId}/compensation`)
        .send(compensationPayload(fixture.structureVersionId, '2027-01-01')),
      api(workspace)
        .post(`/payroll/employees/${fixture.employeeId}/compensation`)
        .send(compensationPayload(fixture.structureVersionId, '2027-01-01')),
    ]);
    expect(compensationResponses.every(({ status }) => status === 409)).toBe(
      true,
    );
    expect(
      await adminPrisma.employeeCompensationVersion.count({
        where: { tenantId: workspace.tenantId },
      }),
    ).toBe(compensationCountBefore);

    const payGroupResponses = await Promise.all([
      api(workspace)
        .post(`/payroll/pay-groups/${fixture.payGroupId}/employees`)
        .send({ employeeId: fixture.employeeId, effectiveFrom: '2027-02-01' }),
      api(workspace)
        .post(`/payroll/pay-groups/${fixture.payGroupId}/employees`)
        .send({ employeeId: fixture.employeeId, effectiveFrom: '2027-02-01' }),
    ]);
    expect(payGroupResponses.every(({ status }) => status === 409)).toBe(true);

    const paymentResponses = await Promise.all([
      api(workspace)
        .post(`/payroll/employees/${fixture.employeeId}/payment-details`)
        .send(paymentPayload('CONCURRENT-BANK-11118877')),
      api(workspace)
        .post(`/payroll/employees/${fixture.employeeId}/payment-details`)
        .send(paymentPayload('CONCURRENT-BANK-22228877')),
    ]);
    expect(
      paymentResponses.every(({ status }) => [201, 409].includes(status)),
    ).toBe(true);
    expect(
      await adminPrisma.employeePaymentDetail.count({
        where: { tenantId: workspace.tenantId, status: 'ACTIVE' },
      }),
    ).toBe(1);
    expectNoSecrets(await persistedPayrollDump(workspace.tenantId));
  });

  it('runs the Phase 1 golden two-tenant API scenario without creating payroll runs', async () => {
    const tenantA = await createWorkspace('golden-a');
    const tenantB = await createWorkspace('golden-b');

    const department = await factory.createDepartment({
      tenantId: tenantA.tenantId,
      name: 'Golden Payroll',
    });
    const employee = await factory.createEmployee({
      tenantId: tenantA.tenantId,
      deptId: department.id,
      employeeCode: 'GOLDEN-EMP-1',
      fullName: 'Golden Payroll Employee',
    });

    await api(tenantA)
      .post('/payroll/settings')
      .send({
        ...settingsPayload(),
        defaultProrationPolicy: { method: 'organization-days' },
      })
      .expect(201);

    const calendar = await api(tenantA)
      .post('/payroll/calendars')
      .send({
        ...calendarPayload('GOLDEN-CAL'),
        periodStartRule: { type: 'fixed-day', day: 26 },
        periodEndRule: { type: 'fixed-day', day: 25 },
        payoutDateRule: { type: 'offset-after-period-end', days: 3 },
      })
      .expect(201);
    const calendarId = bodyId(calendar);

    const payGroup = await api(tenantA)
      .post('/payroll/pay-groups')
      .send({
        ...payGroupPayload('GOLDEN-PG', calendarId),
        prorationPolicyOverride: { method: 'pay-group-days' },
      })
      .expect(201);
    const payGroupId = bodyId(payGroup);

    const policy = await api(tenantA)
      .post('/payroll/policies')
      .send({
        code: 'GOLDEN-PRORATION',
        name: 'Golden Proration',
        category: 'PRORATION',
      })
      .expect(201);
    const policyId = bodyId(policy);
    const organizationPolicyVersion = await api(tenantA)
      .post(`/payroll/policies/${policyId}/versions`)
      .send({
        sourceLevel: 'ORGANIZATION',
        supportsOverrides: true,
        config: { schemaVersion: 'proration-v1', method: 'organization' },
        effectiveFrom: '2026-07-01',
      })
      .expect(201);
    await api(tenantA)
      .post(
        `/payroll/policies/${policyId}/versions/${bodyId(
          organizationPolicyVersion,
        )}/activate`,
      )
      .expect(201);
    const payGroupPolicyVersion = await api(tenantA)
      .post(`/payroll/policies/${policyId}/versions`)
      .send({
        sourceLevel: 'PAY_GROUP',
        sourceEntityId: payGroupId,
        supportsOverrides: true,
        config: { schemaVersion: 'proration-v1', method: 'pay-group' },
        effectiveFrom: '2026-07-01',
      })
      .expect(201);
    const payGroupPolicyVersionId = bodyId(payGroupPolicyVersion);
    await api(tenantA)
      .post(
        `/payroll/policies/${policyId}/versions/${payGroupPolicyVersionId}/activate`,
      )
      .expect(201);

    const basic = await createComponent(tenantA, 'BASIC', 'EARNING', 100);
    const housing = await createComponent(tenantA, 'HOUSING', 'EARNING', 200);
    const deduction = await createComponent(
      tenantA,
      'LOAN-DED',
      'DEDUCTION',
      300,
    );

    const structure = await api(tenantA)
      .post('/payroll/salary-structures')
      .send({
        payGroupId,
        code: 'GOLDEN-STRUCT',
        name: 'Golden Structure',
        currency: 'OMR',
      })
      .expect(201);
    const structureId = bodyId(structure);
    const structureVersion = await api(tenantA)
      .post(`/payroll/salary-structures/${structureId}/versions`)
      .send({ effectiveFrom: '2026-07-01' })
      .expect(201);
    const structureVersionId = bodyId(structureVersion);
    await api(tenantA)
      .post(
        `/payroll/salary-structures/versions/${structureVersionId}/components`,
      )
      .send({
        ...structureComponentPayload(basic.versionId),
        fixedAmountMinor: '1234567',
      })
      .expect(201);
    await api(tenantA)
      .post(
        `/payroll/salary-structures/versions/${structureVersionId}/components`,
      )
      .send({
        ...structureComponentPayload(housing.versionId),
        fixedAmountMinor: '234567',
      })
      .expect(201);
    await api(tenantA)
      .post(
        `/payroll/salary-structures/versions/${structureVersionId}/components`,
      )
      .send({
        ...structureComponentPayload(deduction.versionId),
        fixedAmountMinor: '34567',
      })
      .expect(201);
    await api(tenantA)
      .post(
        `/payroll/salary-structures/${structureId}/versions/${structureVersionId}/activate`,
      )
      .expect(201);

    const profile = await api(tenantA)
      .post(`/payroll/employees/${employee.id}/profile`)
      .send(profilePayload(payGroupId))
      .expect(201);
    await api(tenantA)
      .post(`/payroll/pay-groups/${payGroupId}/employees`)
      .send({ employeeId: employee.id, effectiveFrom: '2026-07-01' })
      .expect(201);
    const compensation = await api(tenantA)
      .post(`/payroll/employees/${employee.id}/compensation`)
      .send({
        ...compensationPayload(structureVersionId, '2026-07-01'),
        baseAmountMinor: '1234567',
        reason: 'Golden Phase 1 compensation',
      })
      .expect(201);
    expect(
      await adminPrisma.employeeCompensationVersion.findFirstOrThrow({
        where: { id: bodyId(compensation) },
        select: { baseAmountMinor: true, currency: true },
      }),
    ).toMatchObject({ baseAmountMinor: 1234567n, currency: 'OMR' });

    await api(tenantA)
      .post(`/payroll/employees/${employee.id}/payment-details`)
      .send(paymentPayload())
      .expect(201);
    await api(tenantA)
      .post(`/payroll/employees/${employee.id}/statutory-details`)
      .send(statutoryPayload())
      .expect(201);

    const approval = await api(tenantA)
      .post('/payroll/approval-policies')
      .send({ name: 'Golden Approval' })
      .expect(201);
    const approvalPolicyId = bodyId(approval);
    const approvalVersion = await api(tenantA)
      .post(`/payroll/approval-policies/${approvalPolicyId}/versions`)
      .send({
        fourEyesEnabled: true,
        makerCanApprove: false,
        requiredLevels: 1,
        allowedPermissions: [PERMISSIONS.PAYROLL_POLICIES_MANAGE],
        allowedRoleKeys: ['BUSINESS_ADMIN'],
        effectiveFrom: '2026-07-01',
      })
      .expect(201);
    await api(tenantA)
      .post(
        `/payroll/approval-policies/${approvalPolicyId}/versions/${bodyId(
          approvalVersion,
        )}/activate`,
      )
      .expect(201);

    for (const component of [basic, housing, deduction]) {
      await api(tenantA)
        .post('/payroll/accounting-mappings')
        .send(accountingPayload(component.id))
        .expect(201);
    }

    const effectivePolicy = await api(tenantA)
      .get(
        `/payroll/policy-matrix/effective?employeeId=${employee.id}&payGroupId=${payGroupId}&policyType=PRORATION&effectiveDate=2026-08-01`,
      )
      .expect(200);
    const effectivePolicyData = bodyData<EffectivePolicyBody>(effectivePolicy);
    expect(effectivePolicyData).toMatchObject({
      sourceLevel: 'PAY_GROUP',
      sourceEntityId: payGroupId,
      policyId,
      policyVersionId: payGroupPolicyVersionId,
    });
    expect(effectivePolicyData.resolvedValue).toMatchObject({
      method: 'pay-group',
    });

    await api(tenantA)
      .get(`/payroll/employees/${employee.id}/compensation/history`)
      .expect(200);
    await api(tenantA)
      .get(`/payroll/components/${basic.id}/versions`)
      .expect(200);
    await api(tenantA)
      .get(`/payroll/salary-structures/${structureId}/versions`)
      .expect(200);
    await api(tenantA).get('/payroll/calendars').expect(200);
    await api(tenantA).get('/payroll/policies').expect(200);

    const paymentDetails = await api(tenantA)
      .get(`/payroll/employees/${employee.id}/payment-details`)
      .expect(200);
    const statutoryDetails = await api(tenantA)
      .get(`/payroll/employees/${employee.id}/statutory-details`)
      .expect(200);
    expectNoSecrets(paymentDetails.body);
    expectNoSecrets(statutoryDetails.body);

    const audit = await api(tenantA).get('/payroll/audit').expect(200);
    expect(bodyData<AuditBody>(audit).length).toBeGreaterThan(0);
    expectNoSecrets(audit.body);
    expectNoSecrets(await persistedPayrollDump(tenantA.tenantId));
    expectNoSecrets(logger.entries);
    expect(
      await adminPrisma.payrollLockPeriod.count({
        where: { tenantId: tenantA.tenantId },
      }),
    ).toBe(0);

    await rawApi(tenantA.tenantId, tenantB.accessToken)
      .get('/payroll/settings')
      .expect(403);
    await expectNotFoundNoLeak(
      api(tenantB).get(`/payroll/calendars/${calendarId}`),
      { profileId: bodyId(profile), employeeId: employee.id } as PayrollFixture,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post('/payroll/pay-groups')
        .send(payGroupPayload('B-X', calendarId)),
      { profileId: bodyId(profile), employeeId: employee.id } as PayrollFixture,
    );
    await expectNotFoundNoLeak(
      api(tenantB).get(`/payroll/employees/${employee.id}/profile`),
      { profileId: bodyId(profile), employeeId: employee.id } as PayrollFixture,
    );
    await expectNotFoundNoLeak(
      api(tenantB)
        .post('/payroll/accounting-mappings')
        .send(accountingPayload(basic.id)),
      { profileId: bodyId(profile), employeeId: employee.id } as PayrollFixture,
    );
    await api(tenantB)
      .post('/payroll/components')
      .send(componentPayload('BASIC'))
      .expect(201);

    const futureCalendar = await api(tenantA)
      .post(`/payroll/calendars/${calendarId}/versions`)
      .send({
        ...calendarVersionPayload('Golden Future Calendar'),
        effectiveFrom: '2027-01-01',
      })
      .expect(201);
    await api(tenantA)
      .post(`/payroll/calendars/${bodyId(futureCalendar)}/activate`)
      .expect(201);

    const futureComponent = await api(tenantA)
      .post(`/payroll/components/${basic.id}/versions`)
      .send({ ...componentVersionPayload(), effectiveFrom: '2027-01-01' })
      .expect(201);
    await api(tenantA)
      .post(
        `/payroll/components/${basic.id}/versions/${bodyId(futureComponent)}/activate`,
      )
      .expect(201);
    expect(
      await adminPrisma.payComponentVersion.count({
        where: {
          tenantId: tenantA.tenantId,
          componentId: basic.id,
          status: 'ACTIVE',
        },
      }),
    ).toBe(1);

    const futureStructure = await api(tenantA)
      .post(`/payroll/salary-structures/${structureId}/versions`)
      .send({ effectiveFrom: '2027-01-01' })
      .expect(201);
    const futureStructureId = bodyId(futureStructure);
    await api(tenantA)
      .post(
        `/payroll/salary-structures/versions/${futureStructureId}/components`,
      )
      .send(structureComponentPayload(bodyId(futureComponent)))
      .expect(201);
    await api(tenantA)
      .post(
        `/payroll/salary-structures/${structureId}/versions/${futureStructureId}/activate`,
      )
      .expect(201);
    expect(
      await adminPrisma.salaryStructureVersion.count({
        where: { tenantId: tenantA.tenantId, structureId, status: 'ACTIVE' },
      }),
    ).toBe(1);
    await api(tenantA)
      .post(
        `/payroll/salary-structures/versions/${structureVersionId}/components`,
      )
      .send(structureComponentPayload(bodyId(futureComponent)))
      .expect(409);

    await api(tenantA)
      .patch(
        `/payroll/employees/${employee.id}/compensation/${bodyId(compensation)}/end`,
      )
      .send({
        effectiveTo: '2026-12-31',
        reason: 'Golden future revision supersedes this compensation',
      })
      .expect(200);
    const futureCompensation = await api(tenantA)
      .post(`/payroll/employees/${employee.id}/compensation`)
      .send({
        ...compensationPayload(futureStructureId, '2027-01-01'),
        baseAmountMinor: '2234567',
        reason: 'Golden future compensation',
      })
      .expect(201);
    const historical = await api(tenantA)
      .get(
        `/payroll/employees/${employee.id}/compensation?effectiveDate=2026-12-01`,
      )
      .expect(200);
    const future = await api(tenantA)
      .get(
        `/payroll/employees/${employee.id}/compensation?effectiveDate=2027-02-01`,
      )
      .expect(200);
    expect(bodyData<IdBody>(historical).id).toBe(bodyId(compensation));
    expect(bodyData<IdBody>(future).id).toBe(bodyId(futureCompensation));
  });

  function api(workspace: Workspace) {
    return rawApi(workspace.tenantId, workspace.accessToken);
  }

  function rawApi(tenantId: string, token: string) {
    const withHeaders = <T extends SupertestTest>(test: T) =>
      test.set('Authorization', `Bearer ${token}`).set('x-tenant-id', tenantId);
    return {
      get: (path: string) =>
        withHeaders(request(app.getHttpServer()).get(path)),
      post: (path: string) =>
        withHeaders(request(app.getHttpServer()).post(path)),
      patch: (path: string) =>
        withHeaders(request(app.getHttpServer()).patch(path)),
      delete: (path: string) =>
        withHeaders(request(app.getHttpServer()).delete(path)),
    };
  }

  async function createComponent(
    workspace: Workspace,
    code: string,
    type: 'EARNING' | 'DEDUCTION',
    calculationOrder: number,
  ) {
    const component = await api(workspace)
      .post('/payroll/components')
      .send({
        code,
        name: `${code} Component`,
        type,
      })
      .expect(201);
    const id = bodyId(component);
    const version = await api(workspace)
      .post(`/payroll/components/${id}/versions`)
      .send({ ...componentVersionPayload(), calculationOrder })
      .expect(201);
    const versionId = bodyId(version);
    await api(workspace)
      .post(`/payroll/components/${id}/versions/${versionId}/activate`)
      .expect(201);
    return { id, versionId };
  }

  async function createWorkspace(prefix: string, enablePayroll = true) {
    sequence += 1;
    const stamp = `${Date.now()}-${sequence}`;
    const email = `admin+${prefix}-${stamp}@payroll-prompt2.test`;
    const signup = await authService.signup({
      companyName: `Prompt2 ${prefix} ${stamp}`,
      workEmail: email,
      password: 'Start123!',
      subdomain: `prompt2-${prefix}-${stamp}`,
      employeeCount: '1-25 employees',
    });
    tenantIds.add(signup.tenantId);
    const user = await adminPrisma.user.findFirstOrThrow({
      where: { tenantId: signup.tenantId, email },
    });
    if (enablePayroll) await enablePayrollForTenant(signup.tenantId, user.id);
    const session = await login(signup.tenantId, email, 'Start123!');
    return {
      tenantId: signup.tenantId,
      adminUserId: user.id,
      accessToken: session.accessToken,
    };
  }

  async function createUserWithPermissions(
    tenantId: string,
    permissionKeys: readonly string[],
  ) {
    sequence += 1;
    const role = await factory.createRole({
      tenantId,
      name: `Prompt2 Role ${sequence}`,
      permissionKeys,
    });
    const email = `user-${sequence}@payroll-prompt2.test`;
    const user = await factory.createUser({
      tenantId,
      email,
      passwordHash: await argon2.hash('Reader123!'),
    });
    await factory.assignRole(user.id, role.id);
    const session = await login(tenantId, email, 'Reader123!');
    return { userId: user.id, accessToken: session.accessToken };
  }

  function login(tenantId: string, email: string, password: string) {
    return TenantContextService.run({ tenantId }, () =>
      authService.login(email, password, '127.0.0.1', 'jest'),
    );
  }

  async function createPayrollFixture(
    workspace: Workspace,
    prefix: string,
  ): Promise<PayrollFixture> {
    const department = await factory.createDepartment({
      tenantId: workspace.tenantId,
      name: `Payroll ${prefix}`,
    });
    const employee = await factory.createEmployee({
      tenantId: workspace.tenantId,
      deptId: department.id,
      employeeCode: `${prefix}-EMP-1`,
      fullName: `Payroll ${prefix} Employee`,
    });

    const settings = await api(workspace)
      .post('/payroll/settings')
      .send(settingsPayload())
      .expect(201);
    const calendar = await api(workspace)
      .post('/payroll/calendars')
      .send(calendarPayload(`${prefix}CAL`))
      .expect(201);
    const calendarId = bodyId(calendar);
    const calendarVersion = await api(workspace)
      .post(`/payroll/calendars/${calendarId}/versions`)
      .send(calendarVersionPayload(`${prefix} Calendar V2`))
      .expect(201);
    const calendarVersionId = bodyId(calendarVersion);
    await api(workspace)
      .post(`/payroll/calendars/${calendarVersionId}/activate`)
      .expect(201);

    const payGroup = await api(workspace)
      .post('/payroll/pay-groups')
      .send(payGroupPayload(`${prefix}PG`, calendarId))
      .expect(201);
    const payGroupId = bodyId(payGroup);

    const policy = await api(workspace)
      .post('/payroll/policies')
      .send({
        code: `${prefix}POL`,
        name: `${prefix} Policy`,
        category: 'PRORATION',
      })
      .expect(201);
    const policyId = bodyId(policy);
    const policyVersion = await api(workspace)
      .post(`/payroll/policies/${policyId}/versions`)
      .send(policyVersionPayload())
      .expect(201);
    const policyVersionId = bodyId(policyVersion);
    await api(workspace)
      .post(
        `/payroll/policies/${policyId}/versions/${policyVersionId}/activate`,
      )
      .expect(201);

    const component = await api(workspace)
      .post('/payroll/components')
      .send(componentPayload(`${prefix}BASIC`))
      .expect(201);
    const componentId = bodyId(component);
    const componentVersion = await api(workspace)
      .post(`/payroll/components/${componentId}/versions`)
      .send(componentVersionPayload())
      .expect(201);
    const componentVersionId = bodyId(componentVersion);
    await api(workspace)
      .post(
        `/payroll/components/${componentId}/versions/${componentVersionId}/activate`,
      )
      .expect(201);

    const structure = await api(workspace)
      .post('/payroll/salary-structures')
      .send({
        payGroupId,
        code: `${prefix}STRUCT`,
        name: `${prefix} Structure`,
        currency: 'OMR',
      })
      .expect(201);
    const structureId = bodyId(structure);
    const structureVersion = await api(workspace)
      .post(`/payroll/salary-structures/${structureId}/versions`)
      .send({ effectiveFrom: '2026-07-01' })
      .expect(201);
    const structureVersionId = bodyId(structureVersion);
    await api(workspace)
      .post(
        `/payroll/salary-structures/versions/${structureVersionId}/components`,
      )
      .send(structureComponentPayload(componentVersionId))
      .expect(201);
    await api(workspace)
      .post(
        `/payroll/salary-structures/${structureId}/versions/${structureVersionId}/activate`,
      )
      .expect(201);

    const profile = await api(workspace)
      .post(`/payroll/employees/${employee.id}/profile`)
      .send(profilePayload(payGroupId))
      .expect(201);
    const profileId = bodyId(profile);
    await api(workspace)
      .post(`/payroll/pay-groups/${payGroupId}/employees`)
      .send({ employeeId: employee.id, effectiveFrom: '2026-07-01' })
      .expect(201);
    const compensation = await api(workspace)
      .post(`/payroll/employees/${employee.id}/compensation`)
      .send(compensationPayload(structureVersionId, '2026-07-01'))
      .expect(201);

    await api(workspace)
      .post(`/payroll/employees/${employee.id}/payment-details`)
      .send(paymentPayload())
      .expect(201);
    await api(workspace)
      .post(`/payroll/employees/${employee.id}/statutory-details`)
      .send(statutoryPayload())
      .expect(201);

    const approval = await api(workspace)
      .post('/payroll/approval-policies')
      .send({ name: `${prefix} Approval` })
      .expect(201);
    const approvalPolicyId = bodyId(approval);
    const approvalVersion = await api(workspace)
      .post(`/payroll/approval-policies/${approvalPolicyId}/versions`)
      .send({
        fourEyesEnabled: true,
        makerCanApprove: false,
        requiredLevels: 1,
        allowedPermissions: [PERMISSIONS.PAYROLL_POLICIES_MANAGE],
        allowedRoleKeys: ['BUSINESS_ADMIN'],
        effectiveFrom: '2026-07-01',
      })
      .expect(201);
    const approvalPolicyVersionId = bodyId(approvalVersion);
    await api(workspace)
      .post(
        `/payroll/approval-policies/${approvalPolicyId}/versions/${approvalPolicyVersionId}/activate`,
      )
      .expect(201);

    const accounting = await api(workspace)
      .post('/payroll/accounting-mappings')
      .send(accountingPayload(componentId))
      .expect(201);

    return {
      employeeId: employee.id,
      settingsVersion: bodyVersion(settings),
      calendarId,
      calendarVersionId,
      payGroupId,
      policyId,
      policyVersionId,
      componentId,
      componentVersionId,
      structureId,
      structureVersionId,
      profileId,
      compensationId: bodyId(compensation),
      approvalPolicyId,
      approvalPolicyVersionId,
      accountingMappingId: bodyId(accounting),
    };
  }

  async function enablePayrollForTenant(tenantId: string, userId: string) {
    const module = await adminPrisma.module.upsert({
      where: { key: 'PAYROLL' },
      update: { availability: 'AVAILABLE', name: 'Payroll' },
      create: { key: 'PAYROLL', name: 'Payroll', availability: 'AVAILABLE' },
    });
    await adminPrisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId: module.id } },
      update: { isActive: true },
      create: {
        tenantId,
        moduleId: module.id,
        isActive: true,
        activatedAt: new Date(),
        activatedBy: userId,
      },
    });
  }

  async function ensurePayrollModuleAvailable() {
    const existing = await adminPrisma.module.findUnique({
      where: { key: 'PAYROLL' },
    });
    originalPayrollAvailability = existing?.availability ?? null;
    payrollModuleCreatedByTest = !existing;
    await adminPrisma.module.upsert({
      where: { key: 'PAYROLL' },
      update: { availability: 'AVAILABLE', name: 'Payroll' },
      create: { key: 'PAYROLL', name: 'Payroll', availability: 'AVAILABLE' },
    });
  }

  async function restorePayrollModule() {
    if (payrollModuleCreatedByTest) {
      await adminPrisma.module.deleteMany({ where: { key: 'PAYROLL' } });
      return;
    }
    if (originalPayrollAvailability) {
      await adminPrisma.module.update({
        where: { key: 'PAYROLL' },
        data: { availability: originalPayrollAvailability },
      });
    }
  }

  function expiredToken(workspace: Workspace) {
    return jwtService.sign(
      {
        sub: workspace.adminUserId,
        email: `expired-${workspace.adminUserId}@payroll-prompt2.test`,
        tenantId: workspace.tenantId,
        roles: ['BUSINESS_ADMIN'],
      },
      {
        secret:
          process.env.JWT_SECRET ||
          'super-secret-default-key-change-in-production',
        expiresIn: '-1s',
      },
    );
  }

  async function expectNotFoundNoLeak(
    test: SupertestTest,
    fixture: PayrollFixture,
    statuses = [404],
  ) {
    const response = await test;
    expect(statuses).toContain(response.status);
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(fixture.profileId);
    expect(serialized).not.toContain('Payroll A Employee');
    expectNoSecrets(response.body);
  }

  async function countPayrollRows(tenantId: string, model: 'payrollCalendar') {
    return adminPrisma[model].count({ where: { tenantId } });
  }

  function auditCount(tenantId: string, action: string) {
    return adminPrisma.tenantAuditLog.count({ where: { tenantId, action } });
  }

  function outboxCount(tenantId: string, eventKey: string) {
    return adminPrisma.outboxEvent.count({ where: { tenantId, eventKey } });
  }

  async function activePolicyVersionIds(tenantId: string, policyId: string) {
    return (
      await adminPrisma.payrollPolicyVersion.findMany({
        where: { tenantId, policyId, status: 'ACTIVE' },
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    ).map(({ id }) => id);
  }

  async function persistedPayrollDump(tenantId: string) {
    return {
      paymentDetails: await adminPrisma.employeePaymentDetail.findMany({
        where: { tenantId },
      }),
      statutoryDetails: await adminPrisma.employeeStatutoryDetail.findMany({
        where: { tenantId },
      }),
      audit: await adminPrisma.tenantAuditLog.findMany({
        where: { tenantId, module: 'payroll' },
      }),
      outbox: await adminPrisma.outboxEvent.findMany({
        where: { tenantId, eventKey: { startsWith: 'payroll.' } },
      }),
    };
  }
});

function settingsPayload() {
  return {
    countryCode: 'OM',
    defaultCurrency: 'OMR',
    locale: 'en-OM',
    timezone: 'Asia/Muscat',
    payFrequency: PayrollFrequency.MONTHLY,
    defaultPayPeriodRule: { type: 'calendar-month' },
    defaultPayoutDateRule: { type: 'fixed-day', day: 28 },
    workingDayBasis: 'CALENDAR_DAYS',
    defaultProrationPolicy: { method: 'fixed-days' },
    defaultRoundingPolicy: { method: 'nearest' },
    moduleStatus: 'ACTIVE',
    effectiveFrom: '2026-07-01',
  };
}

function calendarPayload(code: string) {
  return {
    code,
    name: `${code} Calendar`,
    frequency: PayrollFrequency.MONTHLY,
    periodStartRule: { type: 'month-start' },
    periodEndRule: { type: 'month-end' },
    payoutDateRule: { type: 'fixed-day', day: 28 },
    timezone: 'Asia/Muscat',
    effectiveFrom: '2026-07-01',
  };
}

function calendarVersionPayload(name: string) {
  return {
    name,
    frequency: PayrollFrequency.MONTHLY,
    periodStartRule: { type: 'month-start' },
    periodEndRule: { type: 'month-end' },
    payoutDateRule: { type: 'fixed-day', day: 27 },
    timezone: 'Asia/Muscat',
    effectiveFrom: '2026-08-01',
  };
}

function payGroupPayload(code: string, calendarId?: string) {
  return {
    calendarId,
    name: `${code} Pay Group`,
    code,
    currency: 'OMR',
    countryCode: 'OM',
    prorationPolicyOverride: { method: 'calendar-days' },
    effectiveFrom: '2026-07-01',
  };
}

function policyVersionPayload(effectiveFrom = '2026-07-01') {
  return {
    sourceLevel: 'ORGANIZATION',
    supportsOverrides: true,
    config: { schemaVersion: 'proration-v1', method: 'working-days' },
    effectiveFrom,
  };
}

function componentPayload(code: string) {
  return {
    code,
    name: `${code} Component`,
    type: PayComponentType.EARNING,
  };
}

function componentVersionPayload() {
  return {
    valueMode: PayComponentValueMode.FIXED,
    taxable: true,
    statutory: false,
    recurring: true,
    calculationOrder: 100,
    currencyBehavior: 'employee-currency',
    roundingBehavior: { method: 'nearest' },
    config: { amountType: 'basic' },
    effectiveFrom: '2026-07-01',
  };
}

function structureComponentPayload(payComponentVersionId: string) {
  return {
    payComponentVersionId,
    fixedAmountMinor: '100000',
    calculationOrder: 100,
    required: true,
  };
}

function profilePayload(payGroupId: string) {
  return {
    payGroupId,
    payrollStatus: 'ACTIVE',
    payrollCountry: 'OM',
    paymentMethod: PayrollPaymentMethod.BANK_TRANSFER,
    salaryHold: false,
    effectiveFrom: '2026-07-01',
    metadata: {},
  };
}

function compensationPayload(
  salaryStructureVersionId: string,
  effectiveFrom: string,
) {
  return {
    salaryStructureVersionId,
    baseAmountMinor: '1200000',
    currency: 'OMR',
    effectiveFrom,
    reason: 'Prompt 2 safety fixture compensation',
  };
}

function paymentPayload(accountNumber = secrets[0]) {
  return {
    paymentMethod: PayrollPaymentMethod.BANK_TRANSFER,
    bankName: 'Prompt 2 Bank',
    accountHolderName: 'Prompt 2 Employee',
    accountNumber,
    iban: secrets[1],
    routingNumber: secrets[3],
    swiftBic: 'PROMOMRX',
  };
}

function statutoryPayload(identifier = secrets[2]) {
  return {
    countryCode: 'OM',
    identifierType: 'TAX_ID',
    identifier,
    metadata: { category: 'tax' },
  };
}

function accountingPayload(payComponentId: string) {
  return {
    payComponentId,
    debitAccountCode: '5000',
    creditAccountCode: '2100',
    costCenterRule: { mode: 'department' },
    effectiveFrom: '2026-07-01',
  };
}

function bodyData<T>(response: { body: unknown }) {
  return (response.body as { data: T }).data;
}

function bodyId(response: { body: unknown }) {
  return String((response.body as { data: { id: string } }).data.id);
}

function bodyVersion(response: { body: unknown }) {
  return Number((response.body as { data: { version: number } }).data.version);
}

function expectNoSecrets(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const secret of secrets) {
    expect(serialized).not.toContain(secret);
  }
}

async function cleanupTenant(prisma: PrismaClient, tenantId: string) {
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

  await prisma.outboxEvent.deleteMany({ where: { tenantId } });
  await prisma.tenantAuditLog.deleteMany({ where: { tenantId } });
  await prisma.employeePaymentDetail.deleteMany({ where: { tenantId } });
  await prisma.employeeStatutoryDetail.deleteMany({ where: { tenantId } });
  await prisma.employeeCompensationVersion.deleteMany({ where: { tenantId } });
  await prisma.employeePayrollProfile.deleteMany({ where: { tenantId } });
  await prisma.payrollAccountingMapping.deleteMany({ where: { tenantId } });
  await prisma.salaryStructureVersionComponent.deleteMany({
    where: { tenantId },
  });
  await prisma.salaryStructureVersion.deleteMany({ where: { tenantId } });
  await prisma.salaryStructure.deleteMany({ where: { tenantId } });
  await prisma.payComponentVersion.deleteMany({ where: { tenantId } });
  await prisma.payComponent.deleteMany({ where: { tenantId } });
  await prisma.payrollApprovalPolicyVersion.deleteMany({ where: { tenantId } });
  await prisma.payrollApprovalPolicy.deleteMany({ where: { tenantId } });
  await prisma.payrollPolicyVersion.deleteMany({ where: { tenantId } });
  await prisma.payrollPolicy.deleteMany({ where: { tenantId } });
  await prisma.payGroupEmployeeAssignment.deleteMany({ where: { tenantId } });
  await prisma.payGroup.deleteMany({ where: { tenantId } });
  await prisma.payrollCalendar.deleteMany({ where: { tenantId } });
  await prisma.payrollSettings.deleteMany({ where: { tenantId } });
  await prisma.tenantModule.deleteMany({ where: { tenantId } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: roleIds } },
  });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.verificationToken.deleteMany({ where: { tenantId } });
  await prisma.loginAttempt.deleteMany({ where: { tenantId } });
  await prisma.employmentEvent.deleteMany({ where: { tenantId } });
  await prisma.employee.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.designation.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenantSubscriptionHistory.deleteMany({
    where: { subscription: { tenantId } },
  });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

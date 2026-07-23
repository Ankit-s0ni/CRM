import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { BillingPeriod, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import request, { Test as SupertestTest } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/platform/identity/auth.service';
import { TenantContextService } from '../src/platform/tenancy/public';
import { TestDataFactory } from './support/factories';

type Workspace = { tenantId: string; accessToken: string };
type EmployeeBody = {
  data: {
    id: string;
    employeeCode: string;
    fullName: string;
    status: string;
    dateOfExit: string | null;
    deptId: string;
    designationId: string | null;
    managerId: string | null;
  };
  temporaryCredentials: { email: string; password: string };
};
type ErrorBody = { code: string };
type MobileLoginBody = {
  accessToken: string;
  refreshToken: string;
  user: { tenantId: string; roles: string[] };
};

describe('Employees API (e2e)', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let adminPrisma: PrismaClient;
  let adminPool: Pool;
  let factory: TestDataFactory;
  let workspaceSequence = 0;
  let employeeAccountSequence = 0;
  const tenantIds = new Set<string>();
  const temporaryPlanIds = new Set<string>();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    authService = moduleFixture.get(AuthService);

    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';

    adminPool = new Pool({ connectionString });

    adminPrisma = new PrismaClient({ adapter: new PrismaPg(adminPool) });
    factory = new TestDataFactory(adminPrisma);
  });

  afterAll(async () => {
    for (const tenantId of tenantIds) {
      await cleanupTenant(adminPrisma, tenantId);
    }
    await adminPrisma.subscriptionPlan.deleteMany({
      where: { id: { in: [...temporaryPlanIds] } },
    });
    await app.close();
    await adminPrisma.$disconnect();

    await adminPool.end();
  });

  it('supports employee directory, relationship changes, lifecycle, and history', async () => {
    const workspace = await createAuthenticatedWorkspace();
    const engineering = await factory.createDepartment({
      tenantId: workspace.tenantId,
      name: 'Engineering',
    });
    const operations = await factory.createDepartment({
      tenantId: workspace.tenantId,
      name: 'Operations',
    });
    const engineer = await factory.createDesignation({
      tenantId: workspace.tenantId,
      name: 'Engineer',
    });
    const lead = await factory.createDesignation({
      tenantId: workspace.tenantId,
      name: 'Team Lead',
    });

    const manager = await createEmployee(workspace, {
      employeeCode: 'EMP-0001',
      fullName: 'Mira Manager',
      workType: 'HYBRID',
      dateOfJoining: '2026-01-10',
      deptId: engineering.id,
      designationId: lead.id,
    });
    const employee = await createEmployee(workspace, {
      employeeCode: ' emp  2 ',
      fullName: '  Aarav   Sharma ',
      phone: '+919876543210',
      workType: 'OFFICE',
      dateOfJoining: '2026-02-01',
      deptId: engineering.id,
      designationId: engineer.id,
      managerId: manager.data.id,
    });

    expect(employee.data).toMatchObject({
      employeeCode: 'EMP-2',
      fullName: 'Aarav Sharma',
      managerId: manager.data.id,
    });
    expect(employee.temporaryCredentials.email).toContain('@employee.test');
    expect(employee.temporaryCredentials.password).toBe('AaravSharma987654');

    const mobileLogin = await request(app.getHttpServer())
      .post('/auth/mobile-login')
      .send({
        email: employee.temporaryCredentials.email,
        password: employee.temporaryCredentials.password,
      })
      .expect(200);
    const mobileSession = mobileLogin.body as MobileLoginBody;
    expect(mobileSession.accessToken).toBeTruthy();
    expect(mobileSession.refreshToken).toBeTruthy();
    expect(mobileSession.user.tenantId).toBe(workspace.tenantId);
    expect(mobileSession.user.roles).toContain('EMPLOYEE');

    const workspaceResponse = await api(workspace)
      .get(`/employees/${employee.data.id}/workspace`)
      .expect(200);
    expect(workspaceResponse.body).toMatchObject({
      data: {
        employee: {
          id: employee.data.id,
          fullName: 'Aarav Sharma',
        },
        assignments: {
          offices: [],
          defaultShift: null,
          effectiveAttendancePolicy: {
            scope: 'TENANT_DEFAULT',
            policy: { name: 'Default Office' },
          },
        },
        attendance: { recentDays: [], resolvedExceptionCount: 0 },
        leave: { balances: [], recentRequests: [] },
        devices: [],
        readiness: {
          accountLinked: true,
          managerAssigned: true,
          officeAssigned: false,
          shiftAssigned: false,
          attendancePolicyAssigned: true,
          approvedDevice: false,
        },
      },
    });

    const listResponse = await api(workspace)
      .get('/employees')
      .query({
        search: 'aarav',
        departmentId: engineering.id,
        managerId: manager.data.id,
        status: 'ACTIVE',
        sort: 'joined_desc',
      })
      .expect(200);
    expect(listResponse.body).toMatchObject({
      data: [{ id: employee.data.id, fullName: 'Aarav Sharma' }],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      quota: { used: 2, limit: 25, percentage: 8 },
    });

    await api(workspace)
      .patch(`/employees/${employee.data.id}`)
      .send({
        deptId: operations.id,
        designationId: lead.id,
        effectiveDate: '2026-06-01',
      })
      .expect(200);

    let historyResponse = await api(workspace)
      .get(`/employees/${employee.data.id}/history`)
      .expect(200);
    expect(
      (historyResponse.body as { data: Array<{ eventType: string }> }).data.map(
        ({ eventType }) => eventType,
      ),
    ).toEqual(expect.arrayContaining(['JOINED', 'TRANSFERRED', 'PROMOTED']));

    const terminateResponse = await api(workspace)
      .post(`/employees/${employee.data.id}/terminate`)
      .send({ exitDate: '2026-07-15', reason: 'Resigned' })
      .expect(201);
    expect(terminateResponse.body).toMatchObject({
      data: { status: 'TERMINATED' },
    });

    const reactivateResponse = await api(workspace)
      .post(`/employees/${employee.data.id}/reactivate`)
      .send({ effectiveDate: '2026-07-16' })
      .expect(201);
    expect(reactivateResponse.body).toMatchObject({
      data: { status: 'ACTIVE', dateOfExit: null },
    });

    historyResponse = await api(workspace)
      .get(`/employees/${employee.data.id}/history`)
      .expect(200);
    const eventTypes = (
      historyResponse.body as { data: Array<{ eventType: string }> }
    ).data.map(({ eventType }) => eventType);
    expect(
      eventTypes.filter((eventType) => eventType === 'JOINED'),
    ).toHaveLength(2);
    expect(eventTypes).toContain('EXITED');

    const auditActions = await adminPrisma.tenantAuditLog.findMany({
      where: { tenantId: workspace.tenantId, entityId: employee.data.id },
      select: { action: true },
    });
    expect(auditActions.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        'organization.employee.created',
        'organization.employee.updated',
        'organization.employee.terminated',
        'organization.employee.reactivated',
      ]),
    );

    const nextCodeResponse = await api(workspace)
      .get('/employees/next-code')
      .expect(200);
    expect(nextCodeResponse.body).toEqual({
      data: { employeeCode: 'EMP-0003' },
    });
  });

  it('rejects duplicate identities, manager cycles, and foreign relationships', async () => {
    const workspace = await createAuthenticatedWorkspace();
    const department = await factory.createDepartment({
      tenantId: workspace.tenantId,
      name: 'People',
    });
    const manager = await createEmployee(workspace, {
      employeeCode: 'LEAD-1',
      fullName: 'Lead One',
      phone: '+919000000001',
      workType: 'OFFICE',
      dateOfJoining: '2026-01-01',
      deptId: department.id,
    });
    const report = await createEmployee(workspace, {
      employeeCode: 'REPORT-1',
      fullName: 'Report One',
      workType: 'FIELD',
      dateOfJoining: '2026-01-02',
      deptId: department.id,
      managerId: manager.data.id,
    });

    const duplicateResponse = await api(workspace)
      .post('/employees')
      .send({
        employeeCode: 'lead-1',
        fullName: 'Duplicate Lead',
        email: 'duplicate.lead@employee.test',
        phone: '+919000000099',
        workType: 'OFFICE',
        dateOfJoining: '2026-01-01',
        deptId: department.id,
      })
      .expect(409);
    expect((duplicateResponse.body as ErrorBody).code).toBe(
      'EMPLOYEE_CODE_TAKEN',
    );

    const cycleResponse = await api(workspace)
      .patch(`/employees/${manager.data.id}`)
      .send({ managerId: report.data.id })
      .expect(409);
    expect((cycleResponse.body as ErrorBody).code).toBe('MANAGER_CYCLE');

    const foreignTenant = await factory.createTenant({
      subdomain: `foreign-employee-${Date.now()}`,
    });
    tenantIds.add(foreignTenant.id);
    const foreignDepartment = await factory.createDepartment({
      tenantId: foreignTenant.id,
      name: 'Foreign Department',
    });
    const foreignManager = await factory.createEmployee({
      tenantId: foreignTenant.id,
      deptId: foreignDepartment.id,
      employeeCode: 'FOREIGN-MANAGER',
      fullName: 'Foreign Manager',
    });

    await api(workspace).get(`/employees/${foreignManager.id}`).expect(404);
    await api(workspace)
      .get(`/employees/${foreignManager.id}/workspace`)
      .expect(404);

    const foreignManagerResponse = await api(workspace)
      .patch(`/employees/${report.data.id}`)
      .send({ managerId: foreignManager.id })
      .expect(404);
    expect((foreignManagerResponse.body as ErrorBody).code).toBe(
      'EMPLOYEE_NOT_FOUND',
    );

    const foreignResponse = await api(workspace)
      .post('/employees')
      .send({
        employeeCode: 'FOREIGN-1',
        fullName: 'Foreign Relationship',
        email: 'foreign.relationship@employee.test',
        phone: '+919000000098',
        workType: 'OFFICE',
        dateOfJoining: '2026-01-01',
        deptId: foreignDepartment.id,
      })
      .expect(404);
    expect((foreignResponse.body as ErrorBody).code).toBe(
      'DEPARTMENT_NOT_FOUND',
    );
  });

  it('stores private employee documents with audit and tenant isolation', async () => {
    const workspace = await createAuthenticatedWorkspace();
    const department = await factory.createDepartment({
      tenantId: workspace.tenantId,
      name: 'Document Team',
    });
    const employee = await createEmployee(workspace, {
      employeeCode: 'DOC-1',
      fullName: 'Document Owner',
      workType: 'OFFICE',
      dateOfJoining: '2026-07-01',
      deptId: department.id,
    });

    const presign = await api(workspace)
      .post(`/employees/${employee.data.id}/documents/presign`)
      .send({
        filename: 'employment-contract.pdf',
        contentType: 'application/pdf',
        fileSize: 512,
      })
      .expect(201);
    const presignBody = presign.body as {
      data: {
        objectKey: string;
        uploadUrl: string;
        headers: Record<string, string>;
        expiresIn: number;
      };
    };
    expect(presignBody.data).toMatchObject({ expiresIn: 300 });
    expect(presignBody.data.headers).toMatchObject({
      'Content-Type': 'application/pdf',
    });
    expect(presignBody.data.objectKey).toContain(
      `/employee-documents/${employee.data.id}/`,
    );

    const created = await api(workspace)
      .post(`/employees/${employee.data.id}/documents`)
      .send({
        objectKey: presignBody.data.objectKey,
        filename: 'employment-contract.pdf',
        contentType: 'application/pdf',
        fileSize: 512,
        title: 'Employment contract',
        documentType: 'EMPLOYMENT',
        expiresAt: '2028-07-01',
      })
      .expect(201);
    const createdBody = created.body as {
      data: {
        id: string;
        employeeId: string;
        title: string;
        documentType: string;
      };
    };
    expect(createdBody.data).toMatchObject({
      employeeId: employee.data.id,
      title: 'Employment contract',
      documentType: 'EMPLOYMENT',
    });
    expect(createdBody.data).not.toHaveProperty('objectKey');

    const listed = await api(workspace)
      .get(`/employees/${employee.data.id}/documents`)
      .expect(200);
    const listedBody = listed.body as { data: Array<Record<string, unknown>> };
    expect(listedBody.data).toHaveLength(1);
    expect(listedBody.data[0]).not.toHaveProperty('objectKey');

    const download = await api(workspace)
      .get(
        `/employees/${employee.data.id}/documents/${createdBody.data.id}/download`,
      )
      .expect(200);
    const downloadBody = download.body as {
      data: { url: string; expiresIn: number };
    };
    expect(downloadBody.data).toMatchObject({ expiresIn: 300 });
    expect(downloadBody.data.url).toMatch(/^memory:\/\//);

    const foreignWorkspace = await createAuthenticatedWorkspace();
    await api(foreignWorkspace)
      .get(`/employees/${employee.data.id}/documents`)
      .expect(404);

    await api(workspace)
      .delete(`/employees/${employee.data.id}/documents/${createdBody.data.id}`)
      .expect(200);
    await api(workspace)
      .get(
        `/employees/${employee.data.id}/documents/${createdBody.data.id}/download`,
      )
      .expect(404);

    const auditActions = await adminPrisma.tenantAuditLog.findMany({
      where: {
        tenantId: workspace.tenantId,
        entityId: employee.data.id,
        action: { startsWith: 'organization.employee-document.' },
      },
      select: { action: true },
    });
    expect(auditActions.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        'organization.employee-document.created',
        'organization.employee-document.downloaded',
        'organization.employee-document.deleted',
      ]),
    );

    const firstHistoryPage = await api(workspace)
      .get(`/employees/${employee.data.id}/history`)
      .query({ category: 'DOCUMENT', limit: 2 })
      .expect(200);
    const firstHistoryBody = firstHistoryPage.body as {
      data: Array<{
        action: string;
        category: string;
        actor: { email: string } | null;
        requestId: string | null;
      }>;
      pagination: {
        limit: number;
        nextCursor: string | null;
        hasMore: boolean;
      };
    };
    expect(firstHistoryBody.data).toHaveLength(2);
    expect(
      firstHistoryBody.data.every(({ category }) => category === 'DOCUMENT'),
    ).toBe(true);
    expect(
      firstHistoryBody.data.every(({ actor }) => Boolean(actor?.email)),
    ).toBe(true);
    expect(
      firstHistoryBody.data.every(({ requestId }) => Boolean(requestId)),
    ).toBe(true);
    expect(firstHistoryBody.pagination).toMatchObject({
      limit: 2,
      hasMore: true,
    });
    expect(firstHistoryBody.pagination.nextCursor).toEqual(expect.any(String));

    const secondHistoryPage = await api(workspace)
      .get(`/employees/${employee.data.id}/history`)
      .query({
        category: 'DOCUMENT',
        limit: 2,
        cursor: firstHistoryBody.pagination.nextCursor,
      })
      .expect(200);
    const secondHistoryBody = secondHistoryPage.body as {
      data: Array<{ action: string; category: string }>;
      pagination: { nextCursor: string | null; hasMore: boolean };
    };
    expect(secondHistoryBody.data).toHaveLength(1);
    expect(secondHistoryBody.pagination).toEqual({
      limit: 2,
      nextCursor: null,
      hasMore: false,
    });
    expect(
      [...firstHistoryBody.data, ...secondHistoryBody.data].map(
        ({ action }) => action,
      ),
    ).toEqual(
      expect.arrayContaining([
        'organization.employee-document.created',
        'organization.employee-document.downloaded',
        'organization.employee-document.deleted',
      ]),
    );

    await api(foreignWorkspace)
      .get(`/employees/${employee.data.id}/history`)
      .expect(404);

    const tenantAudit = await api(workspace)
      .get('/audit-logs')
      .query({
        entityId: employee.data.id,
        action: 'employee-document',
        module: 'organization',
      })
      .expect(200);
    const tenantAuditBody = tenantAudit.body as {
      data: Array<{
        action: string;
        actor: { email: string } | null;
        impersonated: boolean;
      }>;
      pagination: { total: number };
    };
    expect(tenantAuditBody.pagination.total).toBe(3);
    const documentCreatedAudit = tenantAuditBody.data.find(
      ({ action }) => action === 'organization.employee-document.created',
    );
    expect(documentCreatedAudit?.actor?.email).toContain(
      '@employee.example.com',
    );
    expect(documentCreatedAudit?.impersonated).toBe(false);

    const foreignAudit = await api(foreignWorkspace)
      .get('/audit-logs')
      .query({ entityId: employee.data.id })
      .expect(200);
    expect((foreignAudit.body as { data: unknown[] }).data).toEqual([]);

    const businessAdminRole = await adminPrisma.role.findFirstOrThrow({
      where: { tenantId: workspace.tenantId, name: 'BUSINESS_ADMIN' },
    });
    const auditPermission = await adminPrisma.permission.findUniqueOrThrow({
      where: { key: 'workspace.audit.read' },
    });
    await adminPrisma.rolePermission.deleteMany({
      where: {
        roleId: businessAdminRole.id,
        permissionId: auditPermission.id,
      },
    });
    await api(workspace).get('/audit-logs').expect(403);
  });

  it('serializes concurrent creation at the quota boundary and emits thresholds once', async () => {
    const workspace = await createAuthenticatedWorkspace();
    const department = await factory.createDepartment({
      tenantId: workspace.tenantId,
      name: 'Quota Team',
    });
    const quotaPlan = await adminPrisma.subscriptionPlan.create({
      data: {
        name: `Employee quota test ${Date.now()}`,
        pricePerUser: '0',
        maxEmployees: 1,
        billingPeriod: BillingPeriod.MONTHLY,
      },
    });
    temporaryPlanIds.add(quotaPlan.id);
    await adminPrisma.tenantSubscription.updateMany({
      where: { tenantId: workspace.tenantId },
      data: { planId: quotaPlan.id },
    });

    const payload = (code: string) => ({
      employeeCode: code,
      fullName: `Quota Employee ${code}`,
      email: `quota.${code.toLowerCase()}@employee.test`,
      phone: code === 'Q-1' ? '+919000000091' : '+919000000092',
      workType: 'OFFICE',
      dateOfJoining: '2026-07-01',
      deptId: department.id,
    });
    const responses = await Promise.all([
      api(workspace).post('/employees').send(payload('Q-1')),
      api(workspace).post('/employees').send(payload('Q-2')),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      (responses.find(({ status }) => status === 409)?.body as ErrorBody).code,
    ).toBe('EMPLOYEE_QUOTA_REACHED');

    expect(
      await adminPrisma.employee.count({
        where: { tenantId: workspace.tenantId },
      }),
    ).toBe(1);
    expect(
      await adminPrisma.employmentEvent.count({
        where: { tenantId: workspace.tenantId, eventType: 'JOINED' },
      }),
    ).toBe(1);
    expect(
      await adminPrisma.outboxEvent.count({
        where: {
          tenantId: workspace.tenantId,
          eventKey: 'organization.quota.threshold_reached',
        },
      }),
    ).toBe(2);
  });

  it('enforces read permission and requires a current subscription', async () => {
    const workspace = await createAuthenticatedWorkspace();
    const department = await factory.createDepartment({
      tenantId: workspace.tenantId,
      name: 'Access Team',
    });
    const businessAdminRole = await adminPrisma.role.findFirstOrThrow({
      where: { tenantId: workspace.tenantId, name: 'BUSINESS_ADMIN' },
    });
    const permissions = await adminPrisma.permission.findMany({
      where: {
        key: {
          in: [
            'organization.employees.read',
            'organization.employees.reports.read',
            'organization.employees.self.read',
          ],
        },
      },
    });
    await adminPrisma.rolePermission.deleteMany({
      where: {
        roleId: businessAdminRole.id,
        permissionId: { in: permissions.map(({ id }) => id) },
      },
    });

    await api(workspace).get('/employees').expect(403);

    await adminPrisma.tenantSubscription.deleteMany({
      where: { tenantId: workspace.tenantId },
    });
    const response = await api(workspace)
      .post('/employees')
      .send({
        employeeCode: 'NO-SUB-1',
        fullName: 'No Subscription',
        email: 'no.subscription@employee.test',
        phone: '+919000000097',
        workType: 'OFFICE',
        dateOfJoining: '2026-07-01',
        deptId: department.id,
      })
      .expect(403);
    expect((response.body as ErrorBody).code).toBe('SUBSCRIPTION_REQUIRED');
  });

  function api(workspace: Workspace) {
    const withHeaders = <T extends SupertestTest>(test: T) =>
      test
        .set('Authorization', `Bearer ${workspace.accessToken}`)
        .set('x-tenant-id', workspace.tenantId);

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

  async function createEmployee(workspace: Workspace, payload: object) {
    employeeAccountSequence += 1;
    const input = payload as { email?: string; phone?: string };
    const response = await api(workspace)
      .post('/employees')
      .send({
        ...payload,
        email:
          input.email ?? `employee-${employeeAccountSequence}@employee.test`,
        phone:
          input.phone ??
          `+919000${String(employeeAccountSequence).padStart(6, '0')}`,
      });
    if (response.status !== 201) {
      throw new Error(
        `Employee creation failed with ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }
    return response.body as EmployeeBody;
  }

  async function createAuthenticatedWorkspace(): Promise<Workspace> {
    workspaceSequence += 1;
    const stamp = `${Date.now()}-${workspaceSequence}`;
    const email = `admin+${stamp}@employee.example.com`;
    const signup = await authService.signup({
      companyName: `Employee Tenant ${stamp}`,
      workEmail: email,
      password: 'Start123!',
      subdomain: `employee-${stamp}`,
      employeeCount: '1-25 employees',
    });
    tenantIds.add(signup.tenantId);
    const subscription = await adminPrisma.tenantSubscription.findFirstOrThrow({
      where: { tenantId: signup.tenantId },
      select: { planId: true },
    });
    await adminPrisma.tenantSubscription.updateMany({
      where: { tenantId: signup.tenantId },
      data: { seatCount: 25 },
    });
    await adminPrisma.subscriptionPlan.update({
      where: { id: subscription.planId },
      data: { maxEmployees: 25 },
    });

    await TenantContextService.run({ tenantId: signup.tenantId }, () =>
      authService.verifyToken(
        String(signup.debugVerificationToken),
        'EMAIL_VERIFY',
      ),
    );
    const session = await TenantContextService.run(
      { tenantId: signup.tenantId },
      () => authService.login(email, 'Start123!', '127.0.0.1', 'jest'),
    );

    return { tenantId: signup.tenantId, accessToken: session.accessToken };
  }
});

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
  await prisma.tenantModule.deleteMany({ where: { tenantId } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: roleIds } },
  });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.verificationToken.deleteMany({ where: { tenantId } });
  await prisma.loginAttempt.deleteMany({ where: { tenantId } });
  await prisma.employmentEvent.deleteMany({ where: { tenantId } });
  await prisma.employeeDocument.deleteMany({ where: { tenantId } });
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

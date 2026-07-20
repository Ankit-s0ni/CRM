import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/identity/auth.service';
import { EmployeeImportProcessor } from '../src/modules/organization/imports/employee-import.processor';
import { EmployeeImportStorageService } from '../src/modules/organization/imports/employee-import-storage.service';
import { TenantContextService } from '../src/shared/tenancy/tenant-context.service';
import { TestDataFactory } from './support/factories';

type Workspace = { tenantId: string; accessToken: string; adminUserId: string };
type ImportResponse = {
  data: {
    id: string;
    status: string;
    totalRows: number;
    successRows: number;
    errorRows: number;
    attemptCount: number;
  };
};

describe('Employee imports (e2e)', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let storage: EmployeeImportStorageService;
  let processor: EmployeeImportProcessor;
  let adminPrisma: PrismaClient;
  let adminPool: Pool;
  let factory: TestDataFactory;
  let sequence = 0;
  const tenantIds = new Set<string>();
  const planIds = new Set<string>();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    authService = moduleFixture.get(AuthService);
    storage = moduleFixture.get(EmployeeImportStorageService);
    processor = moduleFixture.get(EmployeeImportProcessor);

    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';

    adminPool = new Pool({ connectionString });

    adminPrisma = new PrismaClient({ adapter: new PrismaPg(adminPool) });
    factory = new TestDataFactory(adminPrisma);
  });

  afterAll(async () => {
    for (const tenantId of tenantIds)
      await cleanupTenant(adminPrisma, tenantId);
    if (planIds.size) {
      await adminPrisma.subscriptionPlan.deleteMany({
        where: { id: { in: [...planIds] } },
      });
    }
    await app.close();
    await adminPrisma.$disconnect();

    await adminPool.end();
  });

  it('imports 146 of 150 rows, isolates manager lookup, and retries idempotently', async () => {
    const workspace = await createWorkspace(200);
    await createOrganization(workspace.tenantId);

    const foreignTenant = await factory.createTenant({
      subdomain: `foreign-import-${Date.now()}`,
    });
    tenantIds.add(foreignTenant.id);
    const foreignDepartment = await factory.createDepartment({
      tenantId: foreignTenant.id,
      name: 'Engineering',
    });
    await factory.createEmployee({
      tenantId: foreignTenant.id,
      deptId: foreignDepartment.id,
      employeeCode: 'EMP-9999',
      fullName: 'Foreign Manager',
    });

    const fixture = readFileSync(
      join(__dirname, 'fixtures/employees-150.csv'),
      'utf-8',
    );
    const presignResponse = await api(workspace)
      .post('/employee-imports/presign')
      .send({
        filename: 'employees-150.csv',
        contentType: 'text/csv',
        fileSize: Buffer.byteLength(fixture),
      })
      .expect(201);
    const objectKey = String(
      (presignResponse.body as { objectKey: string }).objectKey,
    );
    storage.putTestObject(objectKey, fixture);

    const registerResponse = await api(workspace)
      .post('/employee-imports')
      .send({
        objectKey,
        filename: 'employees-150.csv',
        contentType: 'text/csv',
        fileSize: Buffer.byteLength(fixture),
      })
      .expect(201);
    const body = registerResponse.body as ImportResponse;
    expect(body.data).toMatchObject({
      status: 'COMPLETED',
      totalRows: 150,
      successRows: 146,
      errorRows: 4,
      attemptCount: 1,
    });

    const errorsResponse = await api(workspace)
      .get(`/employee-imports/${body.data.id}/errors`)
      .expect(200);
    const errors = errorsResponse.body as {
      data: Array<{ rowNumber: number; errorCode: string }>;
    };
    expect(errors.data.map(({ errorCode }) => errorCode).sort()).toEqual([
      'DEPARTMENT_NOT_FOUND',
      'DUPLICATE_CODE_IN_FILE',
      'INVALID_EMPLOYMENT_DATES',
      'MANAGER_NOT_FOUND',
    ]);
    expect(
      await adminPrisma.employee.count({
        where: { tenantId: workspace.tenantId },
      }),
    ).toBe(146);
    expect(
      await adminPrisma.employmentEvent.count({
        where: { tenantId: workspace.tenantId, eventType: 'JOINED' },
      }),
    ).toBe(146);
    const importedManager = await adminPrisma.employee.findFirstOrThrow({
      where: { tenantId: workspace.tenantId, employeeCode: 'EMP-0001' },
    });
    const importedReport = await adminPrisma.employee.findFirstOrThrow({
      where: { tenantId: workspace.tenantId, employeeCode: 'EMP-0002' },
    });
    expect(importedReport.managerId).toBe(importedManager.id);

    const retryResponse = await api(workspace)
      .post(`/employee-imports/${body.data.id}/retry`)
      .expect(201);
    expect((retryResponse.body as ImportResponse).data).toMatchObject({
      successRows: 146,
      errorRows: 4,
      attemptCount: 2,
    });
    expect(
      await adminPrisma.employee.count({
        where: { tenantId: workspace.tenantId },
      }),
    ).toBe(146);

    await api(workspace)
      .post('/employee-imports')
      .send({
        objectKey: `${foreignTenant.id}/employee-imports/foreign.csv`,
        filename: 'foreign.csv',
        contentType: 'text/csv',
        fileSize: 100,
      })
      .expect(400);
  });

  it('recovers a failed worker job without duplicating imported rows', async () => {
    const workspace = await createWorkspace(10);
    await createOrganization(workspace.tenantId);
    const objectKey = `${workspace.tenantId}/employee-imports/crash-retry.csv`;
    const job = await adminPrisma.importJob.create({
      data: {
        tenantId: workspace.tenantId,
        requestedBy: workspace.adminUserId,
        kind: 'EMPLOYEES',
        objectKey,
        originalFilename: 'crash-retry.csv',
      },
    });

    await expect(
      processor.process({ tenantId: workspace.tenantId, importJobId: job.id }),
    ).rejects.toBeTruthy();
    expect(
      await adminPrisma.importJob.findUniqueOrThrow({ where: { id: job.id } }),
    ).toMatchObject({ status: 'FAILED', attemptCount: 1 });

    storage.putTestObject(
      objectKey,
      'employee_code,full_name,phone,work_type,department,designation,manager_employee_code,date_of_joining\nREC-1,Recovered Employee,,OFFICE,Engineering,Engineer,,2026-01-15\n',
    );
    await processor.process({
      tenantId: workspace.tenantId,
      importJobId: job.id,
    });
    expect(
      await adminPrisma.importJob.findUniqueOrThrow({ where: { id: job.id } }),
    ).toMatchObject({
      status: 'COMPLETED',
      successRows: 1,
      errorRows: 0,
      attemptCount: 2,
    });
  });

  it('shares the quota lock with concurrent manual employee creation', async () => {
    const workspace = await createWorkspace(1);
    const organization = await createOrganization(workspace.tenantId);
    const csv =
      'employee_code,full_name,phone,work_type,department,designation,manager_employee_code,date_of_joining\nIMP-1,Imported Last Seat,,OFFICE,Engineering,Engineer,,2026-01-15\n';
    const objectKey = `${workspace.tenantId}/employee-imports/quota-race.csv`;
    storage.putTestObject(objectKey, csv);

    const [importResponse, manualResponse] = await Promise.all([
      api(workspace)
        .post('/employee-imports')
        .send({
          objectKey,
          filename: 'quota-race.csv',
          contentType: 'text/csv',
          fileSize: Buffer.byteLength(csv),
        }),
      api(workspace).post('/employees').send({
        employeeCode: 'MAN-1',
        fullName: 'Manual Last Seat',
        email: 'manual.last.seat@employee.test',
        phone: '+919000000096',
        workType: 'OFFICE',
        dateOfJoining: '2026-01-15',
        deptId: organization.departmentId,
        designationId: organization.designationId,
      }),
    ]);

    expect(importResponse.status).toBe(201);
    expect([201, 409]).toContain(manualResponse.status);
    expect(
      await adminPrisma.employee.count({
        where: { tenantId: workspace.tenantId },
      }),
    ).toBe(1);
    const importBody = importResponse.body as ImportResponse;
    expect(importBody.data.successRows + importBody.data.errorRows).toBe(1);
  });

  function api(workspace: Workspace) {
    return {
      get: (path: string) =>
        request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${workspace.accessToken}`)
          .set('x-tenant-id', workspace.tenantId),
      post: (path: string) =>
        request(app.getHttpServer())
          .post(path)
          .set('Authorization', `Bearer ${workspace.accessToken}`)
          .set('x-tenant-id', workspace.tenantId),
    };
  }

  async function createWorkspace(seatCount: number): Promise<Workspace> {
    sequence += 1;
    const stamp = `${Date.now()}-${sequence}`;
    const email = `admin+${stamp}@imports.example.com`;
    const signup = await authService.signup({
      companyName: `Import Tenant ${stamp}`,
      workEmail: email,
      password: 'Start123!',
      subdomain: `imports-${stamp}`,
      employeeCount: '101-250 employees',
    });
    tenantIds.add(signup.tenantId);
    const plan = await adminPrisma.subscriptionPlan.create({
      data: {
        name: `Import Test Plan ${stamp}`,
        pricePerUser: 0,
        currency: 'INR',
        maxEmployees: seatCount,
        billingPeriod: 'MONTHLY',
      },
    });
    planIds.add(plan.id);
    await adminPrisma.tenantSubscription.updateMany({
      where: { tenantId: signup.tenantId },
      data: { seatCount, planId: plan.id },
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
    const admin = await adminPrisma.user.findFirstOrThrow({
      where: { tenantId: signup.tenantId, email },
    });
    return {
      tenantId: signup.tenantId,
      accessToken: session.accessToken,
      adminUserId: admin.id,
    };
  }

  async function createOrganization(tenantId: string) {
    const department = await factory.createDepartment({
      tenantId,
      name: 'Engineering',
    });
    const designation = await factory.createDesignation({
      tenantId,
      name: 'Engineer',
    });
    return { departmentId: department.id, designationId: designation.id };
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

  await prisma.employeeImportRow.deleteMany({ where: { tenantId } });
  await prisma.importJob.deleteMany({ where: { tenantId } });
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
  await prisma.employee.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.designation.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

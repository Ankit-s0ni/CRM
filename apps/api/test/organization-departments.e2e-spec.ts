import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/platform/identity/auth.service';
import { TenantContextService } from '../src/platform/tenancy/public';
import { TestDataFactory } from './support/factories';

type DepartmentResponse = {
  data: {
    id: string;
    name: string;
    parentDeptId: string | null;
    counts?: {
      children: number;
      employees: number;
    };
    children?: DepartmentResponse['data'][];
  };
};

type DepartmentListResponse = {
  data: Array<{
    id: string;
    name: string;
    parentDeptId: string | null;
    children?: DepartmentListResponse['data'];
  }>;
};

type ErrorResponse = {
  code: string;
};

type DesignationResponse = {
  data: {
    id: string;
    name: string;
    employeeCount?: number;
  };
};

type DesignationListResponse = {
  data: Array<{
    id: string;
    name: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

describe('Departments API (e2e)', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let adminPrisma: PrismaClient;
  let adminPool: Pool;
  let factory: TestDataFactory;

  const tenantIds = new Set<string>();

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
    // Prisma's driver adapter is loosely typed here, but matches the same setup used
    // in the existing API integration tests.

    adminPrisma = new PrismaClient({ adapter: new PrismaPg(adminPool) });
    factory = new TestDataFactory(adminPrisma);
  });

  afterAll(async () => {
    for (const tenantId of tenantIds) {
      await cleanupTenant(adminPrisma, tenantId);
    }

    await app.close();
    await adminPrisma.$disconnect();

    await adminPool.end();
  });

  it('supports department CRUD, tree view, and protected delete', async () => {
    const workspace = await createAuthenticatedWorkspace();

    const operationsResponse = await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({ name: 'Operations' })
      .expect(201);
    const operationsBody = operationsResponse.body as DepartmentResponse;

    const financeResponse = await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({ name: 'Finance' })
      .expect(201);
    const financeBody = financeResponse.body as DepartmentResponse;

    const supportResponse = await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({
        name: 'Support',
        parentDeptId: operationsBody.data.id,
      })
      .expect(201);
    const supportBody = supportResponse.body as DepartmentResponse;

    const treeResponse = await request(app.getHttpServer())
      .get('/departments')
      .query({ view: 'tree' })
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(200);
    const treeBody = treeResponse.body as DepartmentListResponse;

    expect(treeBody.data).toEqual([
      expect.objectContaining({
        id: financeBody.data.id,
        name: 'Finance',
        children: [],
      }),
      expect.objectContaining({
        id: operationsBody.data.id,
        name: 'Operations',
        children: [
          expect.objectContaining({
            id: supportBody.data.id,
            name: 'Support',
          }),
        ],
      }),
    ]);

    await request(app.getHttpServer())
      .patch(`/departments/${supportBody.data.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({
        name: 'Customer Support',
        parentDeptId: financeBody.data.id,
      })
      .expect(200);

    const detailResponse = await request(app.getHttpServer())
      .get(`/departments/${financeBody.data.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(200);
    const detailBody = detailResponse.body as DepartmentResponse;

    expect(detailBody.data).toMatchObject({
      id: financeBody.data.id,
      counts: { children: 1, employees: 0 },
    });

    const blockedDeleteResponse = await request(app.getHttpServer())
      .delete(`/departments/${financeBody.data.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(409);
    const blockedDeleteBody = blockedDeleteResponse.body as ErrorResponse;

    expect(blockedDeleteBody.code).toBe('DEPARTMENT_NOT_EMPTY');

    await request(app.getHttpServer())
      .delete(`/departments/${supportBody.data.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/departments/${financeBody.data.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(200);
  });

  it('rejects duplicate names and hierarchy cycles', async () => {
    const workspace = await createAuthenticatedWorkspace();

    const rootResponse = await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({ name: 'People Operations' })
      .expect(201);
    const rootBody = rootResponse.body as DepartmentResponse;

    const childResponse = await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({
        name: 'Talent Acquisition',
        parentDeptId: rootBody.data.id,
      })
      .expect(201);
    const childBody = childResponse.body as DepartmentResponse;

    const duplicateResponse = await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({ name: 'people operations' })
      .expect(409);
    const duplicateBody = duplicateResponse.body as ErrorResponse;

    expect(duplicateBody.code).toBe('DEPARTMENT_NAME_EXISTS');

    const cycleResponse = await request(app.getHttpServer())
      .patch(`/departments/${rootBody.data.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({ parentDeptId: childBody.data.id })
      .expect(409);
    const cycleBody = cycleResponse.body as ErrorResponse;

    expect(cycleBody.code).toBe('DEPARTMENT_CYCLE');
  });

  it('enforces tenant isolation and permission checks', async () => {
    const workspace = await createAuthenticatedWorkspace();
    const foreignTenant = await factory.createTenant({
      companyName: `Foreign Tenant ${Date.now()}`,
      subdomain: `foreign-${Date.now()}`,
    });
    tenantIds.add(foreignTenant.id);

    const foreignDepartment = await factory.createDepartment({
      tenantId: foreignTenant.id,
      name: 'Foreign Operations',
    });
    const foreignDesignation = await factory.createDesignation({
      tenantId: foreignTenant.id,
      name: 'Foreign Designation',
    });

    await request(app.getHttpServer())
      .get(`/departments/${foreignDepartment.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(404);

    const foreignParentResponse = await request(app.getHttpServer())
      .post('/departments')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({ name: 'Invalid Child', parentDeptId: foreignDepartment.id })
      .expect(404);
    expect((foreignParentResponse.body as ErrorResponse).code).toBe(
      'DEPARTMENT_PARENT_NOT_FOUND',
    );

    await request(app.getHttpServer())
      .get(`/designations/${foreignDesignation.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(404);

    const businessAdminRole = await adminPrisma.role.findFirstOrThrow({
      where: { tenantId: workspace.tenantId, name: 'BUSINESS_ADMIN' },
    });
    const readPermission = await adminPrisma.permission.findUniqueOrThrow({
      where: { key: 'organization.departments.read' },
    });

    await adminPrisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId: businessAdminRole.id,
          permissionId: readPermission.id,
        },
      },
    });

    const deniedResponse = await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(403);
    const deniedBody = deniedResponse.body as ErrorResponse;

    expect(deniedBody.code).toBe('FORBIDDEN');
  });

  it('supports designation CRUD, paginated search, and in-use protection', async () => {
    const workspace = await createAuthenticatedWorkspace();

    const createResponse = await request(app.getHttpServer())
      .post('/designations')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({ name: 'Software Engineer' })
      .expect(201);
    const createBody = createResponse.body as DesignationResponse;

    const duplicateResponse = await request(app.getHttpServer())
      .post('/designations')
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({ name: ' software engineer ' })
      .expect(409);
    expect((duplicateResponse.body as ErrorResponse).code).toBe(
      'DESIGNATION_NAME_EXISTS',
    );

    const listResponse = await request(app.getHttpServer())
      .get('/designations')
      .query({ search: ' engineer ', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(200);
    const listBody = listResponse.body as DesignationListResponse;

    expect(listBody.data).toEqual([
      expect.objectContaining({
        id: createBody.data.id,
        name: 'Software Engineer',
      }),
    ]);
    expect(listBody.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/designations/${createBody.data.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .send({ name: 'Senior Software Engineer' })
      .expect(200);
    const updateBody = updateResponse.body as DesignationResponse;

    expect(updateBody.data).toMatchObject({
      id: createBody.data.id,
      name: 'Senior Software Engineer',
    });

    const department = await factory.createDepartment({
      tenantId: workspace.tenantId,
      name: 'Engineering',
    });
    await factory.createEmployee({
      tenantId: workspace.tenantId,
      deptId: department.id,
      designationId: createBody.data.id,
      employeeCode: `ENG-${Date.now()}`,
      fullName: 'Assigned Engineer',
    });

    const blockedDeleteResponse = await request(app.getHttpServer())
      .delete(`/designations/${createBody.data.id}`)
      .set('Authorization', `Bearer ${workspace.accessToken}`)
      .set('x-tenant-id', workspace.tenantId)
      .expect(409);
    const blockedDeleteBody = blockedDeleteResponse.body as ErrorResponse;

    expect(blockedDeleteBody.code).toBe('DESIGNATION_IN_USE');
  });

  async function createAuthenticatedWorkspace() {
    const stamp = Date.now();
    const signup = await authService.signup({
      companyName: `Dept Tenant ${stamp}`,
      workEmail: `admin+${stamp}@dept.example.com`,
      password: 'Start123!',
      subdomain: `dept-${stamp}`,
      employeeCount: '1-25 employees',
    });

    tenantIds.add(signup.tenantId);

    await TenantContextService.run({ tenantId: signup.tenantId }, () =>
      authService.verifyToken(
        String(signup.debugVerificationToken),
        'EMAIL_VERIFY',
      ),
    );

    const session = await TenantContextService.run(
      { tenantId: signup.tenantId },
      () =>
        authService.login(
          `admin+${stamp}@dept.example.com`,
          'Start123!',
          '127.0.0.1',
          'jest',
        ),
    );

    return {
      tenantId: signup.tenantId,
      accessToken: session.accessToken,
    };
  }
});

async function cleanupTenant(prisma: PrismaClient, tenantId: string) {
  const tenantUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const userIds = tenantUsers.map(({ id }) => id);
  const tenantRoles = await prisma.role.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const roleIds = tenantRoles.map(({ id }) => id);
  const departments = await prisma.department.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const departmentIds = departments.map(({ id }) => id);

  await prisma.tenantModule.deleteMany({ where: { tenantId } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: roleIds } },
  });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.verificationToken.deleteMany({ where: { tenantId } });
  await prisma.loginAttempt.deleteMany({ where: { tenantId } });
  await prisma.tenantAuditLog.deleteMany({ where: { tenantId } });
  await prisma.employmentEvent.deleteMany({ where: { tenantId } });
  await prisma.employee.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { id: { in: departmentIds } } });
  await prisma.designation.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

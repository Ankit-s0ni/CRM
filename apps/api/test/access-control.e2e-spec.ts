import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/identity/auth.service';
import { TenantContextService } from '../src/shared/tenancy/tenant-context.service';
import { TestDataFactory } from './support/factories';

type Workspace = {
  tenantId: string;
  accessToken: string;
  adminUserId: string;
};
type ErrorBody = { code: string };

describe('Tenant access control (e2e)', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let adminPrisma: PrismaClient;
  let adminPool: Pool;
  let factory: TestDataFactory;
  let sequence = 0;
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

    adminPrisma = new PrismaClient({ adapter: new PrismaPg(adminPool) });
    factory = new TestDataFactory(adminPrisma);
  });

  afterAll(async () => {
    for (const tenantId of tenantIds)
      await cleanupTenant(adminPrisma, tenantId);
    await app.close();
    await adminPrisma.$disconnect();

    await adminPool.end();
  });

  it('manages permission catalog and custom tenant roles', async () => {
    const workspace = await createWorkspace();

    const permissionsResponse = await api(workspace)
      .get('/permissions')
      .expect(200);
    const permissionBody = permissionsResponse.body as {
      data: Array<{ module: string; keys: string[] }>;
    };
    expect(permissionBody.data.map(({ module }) => module)).toEqual(
      expect.arrayContaining(['organization', 'billing']),
    );

    const createResponse = await api(workspace)
      .post('/roles')
      .send({
        name: 'Attendance Supervisor',
        permissionKeys: ['organization.employees.read'],
      })
      .expect(201);
    const roleId = String(
      (createResponse.body as { data: { id: string } }).data.id,
    );

    await api(workspace)
      .patch(`/roles/${roleId}`)
      .send({ name: 'Senior Attendance Supervisor' })
      .expect(200);
    const replaceResponse = await api(workspace)
      .put(`/roles/${roleId}/permissions`)
      .send({
        permissionKeys: [
          'organization.employees.read',
          'attendance.records.read',
        ],
      })
      .expect(200);
    const replaceBody = replaceResponse.body as {
      data: { permissionKeys: string[] };
    };
    expect(replaceBody.data.permissionKeys).toEqual([
      'attendance.records.read',
      'organization.employees.read',
    ]);

    const matrixResponse = await api(workspace)
      .get('/roles/permission-matrix')
      .expect(200);
    const matrixBody = matrixResponse.body as { roles: Array<{ id: string }> };
    expect(matrixBody.roles.map(({ id }) => id)).toContain(roleId);

    await api(workspace).delete(`/roles/${roleId}`).expect(200);
    const auditActions = await adminPrisma.tenantAuditLog.findMany({
      where: { tenantId: workspace.tenantId, entityId: roleId },
      select: { action: true },
    });
    expect(auditActions.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        'identity.role.created',
        'identity.role.updated',
        'identity.role.permissions_replaced',
        'identity.role.deleted',
      ]),
    );
  });

  it('applies persisted permission changes and protects assigned roles and last admin', async () => {
    const workspace = await createWorkspace();
    const adminRole = await role(workspace.tenantId, 'BUSINESS_ADMIN');
    const hrRole = await role(workspace.tenantId, 'HR_ADMIN');

    let response = await api(workspace)
      .patch(`/users/${workspace.adminUserId}/status`)
      .send({ status: 'DISABLED' })
      .expect(409);
    expect((response.body as ErrorBody).code).toBe('LAST_ADMIN_REQUIRED');

    response = await api(workspace)
      .patch(`/users/${workspace.adminUserId}/roles`)
      .send({ roleIds: [hrRole.id] })
      .expect(409);
    expect((response.body as ErrorBody).code).toBe('LAST_ADMIN_REQUIRED');

    const customRoleResponse = await api(workspace)
      .post('/roles')
      .send({
        name: 'Directory Reader',
        permissionKeys: ['organization.employees.read'],
      })
      .expect(201);
    const customRoleId = String(
      (customRoleResponse.body as { data: { id: string } }).data.id,
    );
    const reader = await createUser(
      workspace.tenantId,
      'reader@example.com',
      customRoleId,
    );
    const readerSession = await login(
      workspace.tenantId,
      reader.email,
      'Reader123!',
    );

    await authenticatedGet(
      workspace.tenantId,
      readerSession.accessToken,
      '/employees',
    ).expect(200);

    await api(workspace)
      .put(`/roles/${customRoleId}/permissions`)
      .send({ permissionKeys: [] })
      .expect(200);
    await authenticatedGet(
      workspace.tenantId,
      readerSession.accessToken,
      '/employees',
    ).expect(403);

    response = await api(workspace)
      .delete(`/roles/${customRoleId}`)
      .expect(409);
    expect((response.body as ErrorBody).code).toBe('ROLE_IN_USE');

    await api(workspace)
      .patch(`/users/${reader.id}/status`)
      .send({ status: 'DISABLED' })
      .expect(200);
    const refreshToken = await adminPrisma.refreshToken.findFirstOrThrow({
      where: { userId: reader.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(refreshToken.revokedAt).toBeTruthy();
    expect(refreshToken.revokedReason).toBe('ADMIN');
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('x-tenant-id', workspace.tenantId)
      .send({ refreshToken: readerSession.refreshToken })
      .expect(401);

    await api(workspace)
      .patch(`/users/${reader.id}/roles`)
      .send({ roleIds: [hrRole.id] })
      .expect(200);
    await api(workspace).delete(`/roles/${customRoleId}`).expect(200);

    response = await api(workspace)
      .delete(`/roles/${adminRole.id}`)
      .expect(409);
    expect((response.body as ErrorBody).code).toBe('SYSTEM_ROLE_IMMUTABLE');
  });

  it('allows HR organization access but denies billing', async () => {
    const workspace = await createWorkspace();
    const hrRole = await role(workspace.tenantId, 'HR_ADMIN');
    const hrUser = await createUser(
      workspace.tenantId,
      'hr.admin@example.com',
      hrRole.id,
    );
    const session = await login(workspace.tenantId, hrUser.email, 'Reader123!');

    await authenticatedGet(
      workspace.tenantId,
      session.accessToken,
      '/employees',
    ).expect(200);
    const denied = await authenticatedGet(
      workspace.tenantId,
      session.accessToken,
      '/billing/subscription',
    ).expect(403);
    expect((denied.body as ErrorBody).code).toBe('FORBIDDEN');

    await api(workspace).get('/billing/subscription').expect(200);

    const employeeRole = await role(workspace.tenantId, 'EMPLOYEE');
    const employeeUser = await createUser(
      workspace.tenantId,
      'employee@example.com',
      employeeRole.id,
    );
    const employeeSession = await login(
      workspace.tenantId,
      employeeUser.email,
      'Reader123!',
    );
    await authenticatedGet(
      workspace.tenantId,
      employeeSession.accessToken,
      '/departments',
    ).expect(403);
  });

  it('limits manager employee reads to self and the reporting chain', async () => {
    const workspace = await createWorkspace();
    const managerRole = await role(workspace.tenantId, 'MANAGER');
    const managerUser = await createUser(
      workspace.tenantId,
      'manager@example.com',
      managerRole.id,
    );
    const department = await factory.createDepartment({
      tenantId: workspace.tenantId,
      name: 'Manager Scope',
    });
    const managerEmployee = await factory.createEmployee({
      tenantId: workspace.tenantId,
      deptId: department.id,
      userId: managerUser.id,
      employeeCode: 'MGR-1',
      fullName: 'Manager User',
    });
    const directReport = await factory.createEmployee({
      tenantId: workspace.tenantId,
      deptId: department.id,
      managerId: managerEmployee.id,
      employeeCode: 'REPORT-1',
      fullName: 'Direct Report',
    });
    const indirectReport = await factory.createEmployee({
      tenantId: workspace.tenantId,
      deptId: department.id,
      managerId: directReport.id,
      employeeCode: 'REPORT-2',
      fullName: 'Indirect Report',
    });
    const unrelated = await factory.createEmployee({
      tenantId: workspace.tenantId,
      deptId: department.id,
      employeeCode: 'OTHER-1',
      fullName: 'Unrelated Employee',
    });
    const session = await login(
      workspace.tenantId,
      managerUser.email,
      'Reader123!',
    );

    const listResponse = await authenticatedGet(
      workspace.tenantId,
      session.accessToken,
      '/employees',
    ).expect(200);
    const listBody = listResponse.body as { data: Array<{ id: string }> };
    expect(listBody.data.map(({ id }) => id).sort()).toEqual(
      [managerEmployee.id, directReport.id, indirectReport.id].sort(),
    );

    await authenticatedGet(
      workspace.tenantId,
      session.accessToken,
      `/employees/${directReport.id}`,
    ).expect(200);
    await authenticatedGet(
      workspace.tenantId,
      session.accessToken,
      `/employees/${unrelated.id}`,
    ).expect(404);
  });

  it('creates no user before acceptance and enforces resend, single use, and expiry', async () => {
    const workspace = await createWorkspace();
    const hrRole = await role(workspace.tenantId, 'HR_ADMIN');
    const invitedEmail = 'invited.hr@example.com';

    const invitationResponse = await api(workspace)
      .post('/users/invitations')
      .send({ email: invitedEmail, roleIds: [hrRole.id] })
      .expect(201);
    const firstToken = String(
      (invitationResponse.body as { debugInvitationToken: string })
        .debugInvitationToken,
    );
    expect(
      await adminPrisma.user.findFirst({
        where: { tenantId: workspace.tenantId, email: invitedEmail },
      }),
    ).toBeNull();

    const resendResponse = await api(workspace)
      .post('/users/invitations/resend')
      .send({ email: invitedEmail })
      .expect(201);
    const secondToken = String(
      (resendResponse.body as { debugInvitationToken: string })
        .debugInvitationToken,
    );
    expect(secondToken).not.toBe(firstToken);

    await request(app.getHttpServer())
      .post('/auth/invitations/accept')
      .send({ token: firstToken, password: 'Invited123!' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/invitations/accept')
      .send({ token: secondToken, password: 'Invited123!' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/invitations/accept')
      .send({ token: secondToken, password: 'Invited123!' })
      .expect(401);

    const invitedUser = await adminPrisma.user.findFirstOrThrow({
      where: { tenantId: workspace.tenantId, email: invitedEmail },
      include: { roles: true },
    });
    expect(invitedUser.roles.map(({ roleId }) => roleId)).toEqual([hrRole.id]);

    const expiryEmail = 'expired.invite@example.com';
    const expiryResponse = await api(workspace)
      .post('/users/invitations')
      .send({ email: expiryEmail, roleIds: [hrRole.id] })
      .expect(201);
    const expiryToken = String(
      (expiryResponse.body as { debugInvitationToken: string })
        .debugInvitationToken,
    );
    await adminPrisma.verificationToken.updateMany({
      where: {
        tokenHash: createHash('sha256').update(expiryToken).digest('hex'),
      },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const expired = await request(app.getHttpServer())
      .post('/auth/invitations/accept')
      .send({ token: expiryToken, password: 'Invited123!' })
      .expect(401);
    expect((expired.body as ErrorBody).code).toBe('INVITATION_INVALID');
  });

  function api(workspace: Workspace) {
    return {
      get: (path: string) =>
        authenticatedGet(workspace.tenantId, workspace.accessToken, path),
      post: (path: string) =>
        request(app.getHttpServer())
          .post(path)
          .set('Authorization', `Bearer ${workspace.accessToken}`)
          .set('x-tenant-id', workspace.tenantId),
      patch: (path: string) =>
        request(app.getHttpServer())
          .patch(path)
          .set('Authorization', `Bearer ${workspace.accessToken}`)
          .set('x-tenant-id', workspace.tenantId),
      put: (path: string) =>
        request(app.getHttpServer())
          .put(path)
          .set('Authorization', `Bearer ${workspace.accessToken}`)
          .set('x-tenant-id', workspace.tenantId),
      delete: (path: string) =>
        request(app.getHttpServer())
          .delete(path)
          .set('Authorization', `Bearer ${workspace.accessToken}`)
          .set('x-tenant-id', workspace.tenantId),
    };
  }

  function authenticatedGet(tenantId: string, token: string, path: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId);
  }

  async function createWorkspace(): Promise<Workspace> {
    sequence += 1;
    const stamp = `${Date.now()}-${sequence}`;
    const email = `admin+${stamp}@access.example.com`;
    const signup = await authService.signup({
      companyName: `Access Tenant ${stamp}`,
      workEmail: email,
      password: 'Start123!',
      subdomain: `access-${stamp}`,
      employeeCount: '1-25 employees',
    });
    tenantIds.add(signup.tenantId);
    await TenantContextService.run({ tenantId: signup.tenantId }, () =>
      authService.verifyToken(
        String(signup.debugVerificationToken),
        'EMAIL_VERIFY',
      ),
    );
    const session = await login(signup.tenantId, email, 'Start123!');
    const admin = await adminPrisma.user.findFirstOrThrow({
      where: { tenantId: signup.tenantId, email },
    });
    return {
      tenantId: signup.tenantId,
      accessToken: session.accessToken,
      adminUserId: admin.id,
    };
  }

  async function createUser(tenantId: string, email: string, roleId: string) {
    const user = await factory.createUser({
      tenantId,
      email,
      passwordHash: await argon2.hash('Reader123!'),
    });
    await factory.assignRole(user.id, roleId);
    return user;
  }

  function login(tenantId: string, email: string, password: string) {
    return TenantContextService.run({ tenantId }, () =>
      authService.login(email, password, '127.0.0.1', 'jest'),
    );
  }

  function role(tenantId: string, name: string) {
    return adminPrisma.role.findFirstOrThrow({ where: { tenantId, name } });
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
  await prisma.employee.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.designation.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

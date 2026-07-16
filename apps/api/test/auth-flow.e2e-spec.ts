import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/identity/auth.service';
import { TenantContextService } from '../src/shared/tenancy/tenant-context.service';

describe('Auth flow integration', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let adminPrisma: PrismaClient;
  let pool: Pool;

  const stamp = Date.now();
  const companyName = `Acme ${stamp}`;
  const subdomain = `acme-${stamp}`;
  const email = `admin+${stamp}@acme.com`;
  const password = 'Start123!';
  const newPassword = 'Updated123!';

  let tenantId = '';
  let verifyToken = '';
  let resetToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    authService = moduleFixture.get(AuthService);

    const connectionString =
      'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';
    pool = new Pool({ connectionString });
    adminPrisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  afterAll(async () => {
    if (tenantId) {
      const tenantUsers = await adminPrisma.user.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const userIds = tenantUsers.map(({ id }) => id);
      const tenantRoles = await adminPrisma.role.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const roleIds = tenantRoles.map(({ id }) => id);

      await adminPrisma.tenantModule.deleteMany({
        where: { tenantId },
      });
      await adminPrisma.userRole.deleteMany({
        where: { userId: { in: userIds } },
      });
      await adminPrisma.rolePermission.deleteMany({
        where: { roleId: { in: roleIds } },
      });
      await adminPrisma.refreshToken.deleteMany({
        where: { userId: { in: userIds } },
      });
      await adminPrisma.verificationToken.deleteMany({
        where: { tenantId },
      });
      await adminPrisma.loginAttempt.deleteMany({
        where: { tenantId },
      });
      await adminPrisma.tenantAuditLog.deleteMany({ where: { tenantId } });
      await adminPrisma.user.deleteMany({
        where: { tenantId },
      });
      await adminPrisma.role.deleteMany({
        where: { tenantId },
      });
      await adminPrisma.policyAssignment.deleteMany({ where: { tenantId } });
      await adminPrisma.attendancePolicy.deleteMany({ where: { tenantId } });
      await adminPrisma.shift.deleteMany({ where: { tenantId } });
      await adminPrisma.tenantSettings.deleteMany({
        where: { tenantId },
      });
      await adminPrisma.tenantSubscription.deleteMany({
        where: { tenantId },
      });
      await adminPrisma.tenant.deleteMany({
        where: { id: tenantId },
      });
    }

    await app.close();
    await adminPrisma.$disconnect();
    await pool.end();
  });

  it('completes signup, verify, login, reset, and suspended-workspace flow', async () => {
    const signupResponse = await authService.signup({
      companyName,
      workEmail: email,
      password,
      subdomain,
      employeeCount: '26-100 employees',
    });

    tenantId = signupResponse.tenantId;
    verifyToken = signupResponse.debugVerificationToken as string;

    expect(tenantId).toBeTruthy();
    expect(verifyToken).toMatch(/^\d{6}$/);

    const provisionedTenant = await adminPrisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        settings: true,
      },
    });
    const provisionedSubscription =
      await adminPrisma.tenantSubscription.findFirst({
        where: { tenantId, status: 'TRIALING' },
        include: { plan: true },
      });
    const provisionedRoles = await adminPrisma.role.findMany({
      where: { tenantId },
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });

    expect(provisionedTenant?.settings).toBeTruthy();
    expect(
      await adminPrisma.policyAssignment.count({
        where: { tenantId, scope: 'TENANT_DEFAULT' },
      }),
    ).toBe(1);
    expect(
      await adminPrisma.attendancePolicy.count({ where: { tenantId } }),
    ).toBe(1);
    expect(await adminPrisma.shift.count({ where: { tenantId } })).toBe(1);
    expect(provisionedSubscription).toMatchObject({
      seatCount: 100,
      plan: { name: 'Starter Trial' },
    });
    expect(provisionedRoles.map(({ name }) => name)).toEqual([
      'BUSINESS_ADMIN',
      'EMPLOYEE',
      'HR_ADMIN',
      'MANAGER',
    ]);
    expect(
      provisionedRoles.find(({ name }) => name === 'BUSINESS_ADMIN')
        ?.permissions.length,
    ).toBeGreaterThan(0);

    await TenantContextService.run({ tenantId }, () =>
      authService.verifyToken(verifyToken, 'EMAIL_VERIFY'),
    );

    const verifiedUser = await adminPrisma.user.findFirst({
      where: { tenantId, email },
    });
    expect(verifiedUser?.emailVerifiedAt).toBeTruthy();

    await expect(
      TenantContextService.run({ tenantId }, () =>
        authService.verifyToken(verifyToken, 'EMAIL_VERIFY'),
      ),
    ).rejects.toThrow();

    const loginResponse = await TenantContextService.run({ tenantId }, () =>
      authService.login(email, password, '127.0.0.1', 'jest'),
    );

    expect(loginResponse.accessToken).toBeTruthy();
    expect(loginResponse.refreshToken).toBeTruthy();

    const rotatedSession = await TenantContextService.run({ tenantId }, () =>
      authService.refresh(loginResponse.refreshToken, '127.0.0.1', 'jest'),
    );
    expect(rotatedSession.refreshToken).not.toBe(loginResponse.refreshToken);

    await expect(
      TenantContextService.run({ tenantId }, () =>
        authService.refresh(loginResponse.refreshToken, '127.0.0.1', 'jest'),
      ),
    ).rejects.toThrow('Refresh token expired or revoked');
    await expect(
      TenantContextService.run({ tenantId }, () =>
        authService.refresh(rotatedSession.refreshToken, '127.0.0.1', 'jest'),
      ),
    ).rejects.toThrow('Refresh token expired or revoked');

    const replayedFamily = await adminPrisma.refreshToken.findMany({
      where: { userId: loginResponse.user.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(replayedFamily).toHaveLength(2);
    expect(replayedFamily.every(({ revokedAt }) => Boolean(revokedAt))).toBe(
      true,
    );
    expect(replayedFamily.at(-1)?.revokedReason).toBe('REUSE_DETECTED');

    const workspaceStatus = await request(app.getHttpServer())
      .get('/workspace/status')
      .query({ subdomain })
      .expect(200);
    expect(workspaceStatus.body).toMatchObject({
      available: true,
      status: 'TRIAL',
      workspace: { id: tenantId, subdomain },
    });

    const sessionResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.accessToken}`)
      .set('x-tenant-id', tenantId)
      .expect(200);
    expect(sessionResponse.body).toMatchObject({
      user: {
        email,
        emailVerified: true,
        roles: ['BUSINESS_ADMIN'],
      },
      workspace: { id: tenantId, subdomain },
    });

    const modulesResponse = await request(app.getHttpServer())
      .get('/workspace/modules')
      .set('Authorization', `Bearer ${loginResponse.accessToken}`)
      .set('x-tenant-id', tenantId)
      .expect(200);
    expect((modulesResponse.body as { modules: unknown[] }).modules).toEqual([
      expect.objectContaining({ key: 'ATTENDANCE', name: 'Attendance' }),
    ]);

    const businessAdminRole = provisionedRoles.find(
      ({ name }) => name === 'BUSINESS_ADMIN',
    );
    const modulesPermission = await adminPrisma.permission.findUnique({
      where: { key: 'workspace.modules.read' },
    });
    expect(businessAdminRole).toBeTruthy();
    expect(modulesPermission).toBeTruthy();

    await adminPrisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId: businessAdminRole!.id,
          permissionId: modulesPermission!.id,
        },
      },
    });

    const deniedModulesResponse = await request(app.getHttpServer())
      .get('/workspace/modules')
      .set('Authorization', `Bearer ${loginResponse.accessToken}`)
      .set('x-tenant-id', tenantId)
      .expect(403);
    expect((deniedModulesResponse.body as { code: string }).code).toBe(
      'FORBIDDEN',
    );

    await adminPrisma.rolePermission.create({
      data: {
        roleId: businessAdminRole!.id,
        permissionId: modulesPermission!.id,
      },
    });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.accessToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${loginResponse.accessToken}`)
      .set('x-tenant-id', tenantId)
      .send({ refreshToken: loginResponse.refreshToken })
      .expect(200);

    await expect(
      TenantContextService.run({ tenantId }, () =>
        authService.refresh(loginResponse.refreshToken, '127.0.0.1', 'jest'),
      ),
    ).rejects.toThrow('Refresh token expired or revoked');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        TenantContextService.run({ tenantId }, () =>
          authService.login(email, 'WrongPassword!', '127.0.0.1', 'jest'),
        ),
      ).rejects.toThrow('Invalid credentials');
    }
    await expect(
      TenantContextService.run({ tenantId }, () =>
        authService.login(email, password, '127.0.0.1', 'jest'),
      ),
    ).rejects.toThrow('Account temporarily locked');

    const resetRequestResponse = await TenantContextService.run(
      { tenantId },
      () => authService.requestPasswordReset(email),
    );

    resetToken = resetRequestResponse?.debugResetToken as string;
    expect(resetToken).toBeTruthy();

    await TenantContextService.run({ tenantId }, () =>
      authService.resetPassword(resetToken, newPassword),
    );

    await expect(
      TenantContextService.run({ tenantId }, () =>
        authService.resetPassword(resetToken, newPassword),
      ),
    ).rejects.toThrow();

    const reloginResponse = await TenantContextService.run({ tenantId }, () =>
      authService.login(email, newPassword, '127.0.0.1', 'jest'),
    );
    expect(reloginResponse.accessToken).toBeTruthy();

    await adminPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'SUSPENDED',
        suspendedReason: 'Billing overdue',
        suspendedAt: new Date(),
      },
    });

    const suspendedStatus = await request(app.getHttpServer())
      .get('/workspace/status')
      .query({ subdomain })
      .expect(200);
    expect(suspendedStatus.body).toMatchObject({
      available: false,
      status: 'SUSPENDED',
      errorCode: 'TENANT_SUSPENDED',
      unavailableReason: 'Billing overdue',
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', tenantId)
      .send({ email, password: newPassword })
      .expect(403);

    await request(app.getHttpServer())
      .get('/departments')
      .set('Authorization', `Bearer ${reloginResponse.accessToken}`)
      .set('x-tenant-id', tenantId)
      .expect(403);

    await expect(
      TenantContextService.run({ tenantId }, () =>
        authService.login(email, newPassword, '127.0.0.1', 'jest'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

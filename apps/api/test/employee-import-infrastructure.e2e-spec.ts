import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/identity/auth.service';
import { EmployeeImportStorageService } from '../src/modules/organization/imports/employee-import-storage.service';
import { TenantContextService } from '../src/shared/tenancy/tenant-context.service';

describe('Employee import infrastructure (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let auth: AuthService;
  let storage: EmployeeImportStorageService;
  let tenantId = '';

  beforeAll(async () => {
    process.env.IMPORT_STORAGE_MODE = 's3';
    process.env.IMPORT_QUEUE_MODE = 'bullmq';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();

    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';

    pool = new Pool({ connectionString });

    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    auth = moduleFixture.get(AuthService);
    storage = moduleFixture.get(EmployeeImportStorageService);
  });

  it('uploads through MinIO and processes through BullMQ and Redis', async () => {
    const stamp = Date.now();
    const email = `infra+${stamp}@imports.example.com`;
    const signup = await auth.signup({
      companyName: `Import Infra ${stamp}`,
      workEmail: email,
      password: 'Start123!',
      subdomain: `import-infra-${stamp}`,
      employeeCount: '1-25 employees',
    });
    tenantId = signup.tenantId;
    await prisma.department.create({ data: { tenantId, name: 'Engineering' } });
    await prisma.designation.create({ data: { tenantId, name: 'Engineer' } });
    await TenantContextService.run({ tenantId }, () =>
      auth.verifyToken(String(signup.debugVerificationToken), 'EMAIL_VERIFY'),
    );
    const session = await TenantContextService.run({ tenantId }, () =>
      auth.login(email, 'Start123!', '127.0.0.1', 'jest-infrastructure'),
    );
    const csv =
      'employee_code,full_name,phone,work_type,department,designation,manager_employee_code,date_of_joining\nINFRA-1,Infrastructure Employee,,OFFICE,Engineering,Engineer,,2026-01-15\n';
    const signed = await storage.presign(
      tenantId,
      'infrastructure.csv',
      'text/csv',
    );
    await storage.putObject(signed.objectKey, csv);

    const register = await request(app.getHttpServer())
      .post('/employee-imports')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('x-tenant-id', tenantId)
      .send({
        objectKey: signed.objectKey,
        filename: 'infrastructure.csv',
        contentType: 'text/csv',
        fileSize: Buffer.byteLength(csv),
      })
      .expect(201);
    const importId = String(
      (register.body as { data: { id: string } }).data.id,
    );

    let status = 'PENDING';
    for (
      let attempt = 0;
      attempt < 30 && status !== 'COMPLETED';
      attempt += 1
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const response = await request(app.getHttpServer())
        .get(`/employee-imports/${importId}`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);
      status = String(
        (response.body as { data: { status: string } }).data.status,
      );
    }
    expect(status).toBe('COMPLETED');
    expect(await prisma.employee.count({ where: { tenantId } })).toBe(1);
  });

  afterAll(async () => {
    if (tenantId) await cleanup(prisma, tenantId);
    await app.close();
    await prisma.$disconnect();

    await pool.end();
    delete process.env.IMPORT_STORAGE_MODE;
    delete process.env.IMPORT_QUEUE_MODE;
  });
});

async function cleanup(prisma: PrismaClient, tenantId: string) {
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
  await prisma.tenantAuditLog.deleteMany({ where: { tenantId } });
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
  await prisma.tenantModule.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('RLS Isolation Test', () => {
  let adminPrisma: PrismaClient;
  let pool: Pool;
  let tenantA_Id = '';
  let tenantB_Id = '';
  let tenantAEmail = '';
  let tenantBEmail = '';

  beforeAll(async () => {
    const connectionString =
      'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';
    pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    adminPrisma = new PrismaClient({ adapter });
    const suffix = `${Date.now()}-${process.pid}`;
    tenantAEmail = `user-a-${suffix}@rls.test`;
    tenantBEmail = `user-b-${suffix}@rls.test`;

    const tenantA = await adminPrisma.tenant.create({
      data: {
        companyName: 'Tenant A Test',
        subdomain: `tenanta-${suffix}`,
        status: 'ACTIVE',
      },
    });
    tenantA_Id = tenantA.id;

    const tenantB = await adminPrisma.tenant.create({
      data: {
        companyName: 'Tenant B Test',
        subdomain: `tenantb-${suffix}`,
        status: 'ACTIVE',
      },
    });
    tenantB_Id = tenantB.id;

    const userA = await adminPrisma.user.create({
      data: {
        tenantId: tenantA_Id,
        email: tenantAEmail,
        passwordHash: 'hash',
        status: 'ACTIVE',
      },
    });
    const userB = await adminPrisma.user.create({
      data: {
        tenantId: tenantB_Id,
        email: tenantBEmail,
        passwordHash: 'hash',
        status: 'ACTIVE',
      },
    });
    for (const [tenantId, userId, suffix] of [
      [tenantA_Id, userA.id, 'A'],
      [tenantB_Id, userB.id, 'B'],
    ] as const) {
      const department = await adminPrisma.department.create({
        data: { tenantId, name: `Department ${suffix}` },
      });
      await adminPrisma.designation.create({
        data: { tenantId, name: `Designation ${suffix}` },
      });
      await adminPrisma.employee.create({
        data: {
          tenantId,
          deptId: department.id,
          employeeCode: `RLS-${suffix}`,
          fullName: `RLS Employee ${suffix}`,
          workType: 'OFFICE',
          dateOfJoining: new Date('2026-01-01'),
        },
      });
      await adminPrisma.role.create({
        data: { tenantId, name: `RLS_ROLE_${suffix}` },
      });
      await adminPrisma.importJob.create({
        data: { tenantId, requestedBy: userId, kind: 'EMPLOYEES' },
      });
      await adminPrisma.tenantAuditLog.create({
        data: {
          tenantId,
          actorUserId: userId,
          action: 'rls.test',
          module: 'test',
        },
      });
    }
  });

  afterAll(async () => {
    await adminPrisma.importJob.deleteMany({
      where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
    });
    await adminPrisma.tenantAuditLog.deleteMany({
      where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
    });
    await adminPrisma.employee.deleteMany({
      where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
    });
    await adminPrisma.department.deleteMany({
      where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
    });
    await adminPrisma.designation.deleteMany({
      where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
    });
    await adminPrisma.role.deleteMany({
      where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
    });
    await adminPrisma.user.deleteMany({
      where: { email: { in: [tenantAEmail, tenantBEmail] } },
    });
    await adminPrisma.tenant.deleteMany({
      where: { id: { in: [tenantA_Id, tenantB_Id] } },
    });
    await adminPrisma.$disconnect();
    await pool.end();
  });

  it('should isolate users via app_user role', async () => {
    const userConnectionString =
      'postgresql://app_user:app_password@localhost:5433/hrms_dev?schema=public';
    const userPool = new Pool({ connectionString: userConnectionString });
    const userAdapter = new PrismaPg(userPool);
    const userPrisma = new PrismaClient({ adapter: userAdapter });

    const tenantAData = await userPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantA_Id}::text, true)`;
      return {
        users: await tx.user.findMany(),
        departments: await tx.department.findMany(),
        designations: await tx.designation.findMany(),
        employees: await tx.employee.findMany(),
        roles: await tx.role.findMany({ where: { tenantId: { not: null } } }),
        imports: await tx.importJob.findMany(),
        audits: await tx.tenantAuditLog.findMany(),
      };
    });

    const tenantBData = await userPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantB_Id}::text, true)`;
      return {
        users: await tx.user.findMany(),
        departments: await tx.department.findMany(),
        designations: await tx.designation.findMany(),
        employees: await tx.employee.findMany(),
        roles: await tx.role.findMany({ where: { tenantId: { not: null } } }),
        imports: await tx.importJob.findMany(),
        audits: await tx.tenantAuditLog.findMany(),
      };
    });

    const noContextUsers = await userPrisma.user.findMany();

    await userPrisma.$disconnect();
    await userPool.end();

    for (const records of Object.values(tenantAData)) {
      expect(records.length).toBeGreaterThan(0);
      expect(records.every(({ tenantId }) => tenantId === tenantA_Id)).toBe(
        true,
      );
    }
    for (const records of Object.values(tenantBData)) {
      expect(records.length).toBeGreaterThan(0);
      expect(records.every(({ tenantId }) => tenantId === tenantB_Id)).toBe(
        true,
      );
    }
    expect(noContextUsers).toEqual([]);
  });

  it('prevents the application role from modifying audit records', async () => {
    const userPool = new Pool({
      connectionString:
        'postgresql://app_user:app_password@localhost:5433/hrms_dev?schema=public',
    });
    const client = await userPool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1::text, true)", [
        tenantA_Id,
      ]);
      await expect(
        client.query(
          'UPDATE tenant_audit_logs SET action = $1 WHERE "tenantId" = $2',
          ['tampered', tenantA_Id],
        ),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
      await userPool.end();
    }
  });
});

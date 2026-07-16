import {
  EmployeeStatus,
  PrismaClient,
  Role,
  SubscriptionStatus,
  UserStatus,
  WorkType,
} from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../../src/shared/authorization/permissions.constants';

type CreateTenantOptions = {
  companyName?: string;
  subdomain?: string;
  status?: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CHURNED';
};

type CreateUserOptions = {
  tenantId: string;
  email?: string;
  passwordHash?: string;
  status?: UserStatus;
  emailVerifiedAt?: Date | null;
};

type CreateRoleOptions = {
  tenantId: string | null;
  name: string;
  isSystem?: boolean;
  permissionKeys?: readonly string[];
};

type CreateDepartmentOptions = {
  tenantId: string;
  name?: string;
  parentDeptId?: string | null;
};

type CreateDesignationOptions = {
  tenantId: string;
  name?: string;
};

type CreateEmployeeOptions = {
  tenantId: string;
  deptId: string;
  designationId?: string | null;
  managerId?: string | null;
  userId?: string | null;
  employeeCode?: string;
  fullName?: string;
  phone?: string | null;
  status?: EmployeeStatus;
  workType?: WorkType;
  dateOfJoining?: string;
  dateOfExit?: string | null;
};

export class TestDataFactory {
  constructor(private readonly prisma: PrismaClient) {}

  async createTenant(options: CreateTenantOptions = {}) {
    const stamp = Date.now();
    const subdomain = options.subdomain ?? `tenant-${stamp}`;
    const tenant = await this.prisma.tenant.create({
      data: {
        companyName: options.companyName ?? `Tenant ${stamp}`,
        subdomain,
        status: options.status ?? 'ACTIVE',
      },
    });

    await this.prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
      },
    });

    return tenant;
  }

  async ensureTrialSubscription(tenantId: string, seatCount = 25) {
    const plan = await this.prisma.subscriptionPlan.upsert({
      where: { name: 'Starter Trial' },
      update: {},
      create: {
        name: 'Starter Trial',
        pricePerUser: '0',
        maxEmployees: 100,
        billingPeriod: 'MONTHLY',
      },
    });

    return this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: plan.id,
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        seatCount,
      },
    });
  }

  async createUser(options: CreateUserOptions) {
    return this.prisma.user.create({
      data: {
        tenantId: options.tenantId,
        email: options.email ?? `user-${Date.now()}@example.com`,
        passwordHash: options.passwordHash ?? 'hash',
        status: options.status ?? UserStatus.ACTIVE,
        emailVerifiedAt: options.emailVerifiedAt ?? new Date(),
      },
    });
  }

  async createRole(options: CreateRoleOptions): Promise<Role> {
    const role = await this.prisma.role.create({
      data: {
        tenantId: options.tenantId,
        name: options.name,
        isSystem: options.isSystem ?? false,
      },
    });

    if (options.permissionKeys?.length) {
      const permissions = await this.prisma.permission.findMany({
        where: { key: { in: [...options.permissionKeys] } },
      });

      await this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }

    return role;
  }

  async createSystemRole(
    tenantId: string,
    roleName: keyof typeof DEFAULT_ROLE_PERMISSIONS,
  ) {
    return this.createRole({
      tenantId,
      name: roleName,
      isSystem: true,
      permissionKeys: DEFAULT_ROLE_PERMISSIONS[roleName],
    });
  }

  async assignRole(userId: string, roleId: string) {
    return this.prisma.userRole.create({
      data: { userId, roleId },
    });
  }

  async createDepartment(options: CreateDepartmentOptions) {
    return this.prisma.department.create({
      data: {
        tenantId: options.tenantId,
        name: options.name ?? `Department ${Date.now()}`,
        parentDeptId: options.parentDeptId ?? null,
      },
    });
  }

  async createDesignation(options: CreateDesignationOptions) {
    return this.prisma.designation.create({
      data: {
        tenantId: options.tenantId,
        name: options.name ?? `Designation ${Date.now()}`,
      },
    });
  }

  async createEmployee(options: CreateEmployeeOptions) {
    return this.prisma.employee.create({
      data: {
        tenantId: options.tenantId,
        deptId: options.deptId,
        designationId: options.designationId ?? null,
        managerId: options.managerId ?? null,
        userId: options.userId ?? null,
        employeeCode: options.employeeCode ?? `EMP-${Date.now()}`,
        fullName: options.fullName ?? 'Test Employee',
        phone: options.phone ?? null,
        status: options.status ?? EmployeeStatus.ACTIVE,
        workType: options.workType ?? WorkType.OFFICE,
        dateOfJoining: new Date(options.dateOfJoining ?? '2026-01-01'),
        dateOfExit: options.dateOfExit ? new Date(options.dateOfExit) : null,
      },
    });
  }
}

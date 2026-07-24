import { AuditService } from '../audit/public';
import type { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../tenancy/public';
import { RolesService } from './roles.service';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
} from '../../shared/authorization/permissions.constants';

describe('RolesService', () => {
  it('groups the permission catalog and maps sorted role permissions', async () => {
    const transaction = {
      permission: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { key: 'identity.users.read' },
            { key: 'organization.employees.update' },
            { key: 'organization.employees.read' },
          ]),
      },
      role: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'role-id',
            name: 'HR_ADMIN',
            isSystem: true,
            permissions: [
              { permission: { key: 'organization.employees.update' } },
              { permission: { key: 'organization.employees.read' } },
            ],
            _count: { users: 2 },
          },
        ]),
      },
    };
    const prisma = {
      forTenant: (callback: (tx: object) => unknown) => callback(transaction),
    } as unknown as PrismaService;
    const service = new RolesService(
      prisma,
      {} as TenantContextService,
      {} as AuditService,
    );

    await expect(service.matrix()).resolves.toEqual({
      permissions: [
        { module: 'identity', keys: ['identity.users.read'] },
        {
          module: 'organization',
          keys: [
            'organization.employees.update',
            'organization.employees.read',
          ],
        },
      ],
      roles: [
        {
          id: 'role-id',
          name: 'HR_ADMIN',
          isSystem: true,
          permissionKeys: [
            'organization.employees.read',
            'organization.employees.update',
          ],
          assignedUsers: 2,
        },
      ],
    });
  });

  it('does not allow system role permissions to be replaced', async () => {
    const transaction = {
      role: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'role-id',
          tenantId: 'tenant-id',
          name: 'HR_ADMIN',
          isSystem: true,
        }),
      },
    };
    const prisma = {
      forTenant: (callback: (tx: object) => unknown) => callback(transaction),
    } as unknown as PrismaService;
    const service = new RolesService(
      prisma,
      {} as TenantContextService,
      {} as AuditService,
    );

    await expect(
      service.replacePermissions('role-id', { permissionKeys: [] }, 'actor-id'),
    ).rejects.toMatchObject({
      response: { code: 'SYSTEM_ROLE_IMMUTABLE' },
    });
  });

  it('keeps HR operational without billing or role administration access', () => {
    const permissions = DEFAULT_ROLE_PERMISSIONS.HR_ADMIN;

    expect(permissions).toContain(PERMISSIONS.EMPLOYEES_UPDATE);
    expect(permissions).toContain(PERMISSIONS.ATTENDANCE_RECORDS_READ);
    expect(permissions).toContain(PERMISSIONS.LEAVE_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.ROLES_UPDATE);
    expect(permissions).not.toContain(PERMISSIONS.USERS_ROLES_UPDATE);
    expect(permissions).not.toContain(PERMISSIONS.BILLING_SUBSCRIPTION_READ);
  });
});

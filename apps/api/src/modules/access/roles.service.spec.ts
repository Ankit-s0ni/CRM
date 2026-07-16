import { AuditService } from '../../shared/audit/audit.service';
import type { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { RolesService } from './roles.service';

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
});

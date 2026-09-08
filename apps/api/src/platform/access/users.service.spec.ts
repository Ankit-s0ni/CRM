import type { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../tenancy/public';
import { AuditService } from '../audit/public';
import { UsersService } from './users.service';

describe('UsersService tenant isolation', () => {
  it('only lists users from the active workspace', async () => {
    const transaction = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const prisma = {
      forTenant: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    } as unknown as PrismaService;
    const tenantContext = { tenantId: 'tenant-a' } as TenantContextService;
    const service = new UsersService(
      prisma,
      {} as AuditService,
      tenantContext,
    );

    await service.list({});

    expect(transaction.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a' }) }),
    );
    expect(transaction.user.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a' }) }),
    );
  });
});

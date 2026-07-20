import { AuditService } from '../../shared/audit/audit.service';
import type { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { EmployeeQuotaService } from './employee-quota.service';
import { EmployeesService } from './employees.service';
import { EmployeeQuickFilter } from './dto/list-employees-query.dto';

describe('EmployeesService', () => {
  it('suggests the next code after the largest matching employee code', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { employeeCode: 'EMP-0002' },
        { employeeCode: 'external-99' },
        { employeeCode: 'emp-0010' },
        { employeeCode: 'EMP-invalid' },
      ]);
    const prisma = {
      forTenant: (callback: (tx: object) => unknown) =>
        callback({ employee: { findMany } }),
    } as unknown as PrismaService;
    const service = new EmployeesService(
      prisma,
      {} as TenantContextService,
      {} as EmployeeQuotaService,
      {} as AuditService,
    );

    await expect(service.nextCode()).resolves.toEqual({
      data: { employeeCode: 'EMP-0011' },
    });
  });

  it('applies joining-soon workforce links as validated database filters', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          employee: null,
          roles: [
            {
              role: {
                permissions: [
                  { permission: { key: 'organization.employees.read' } },
                ],
              },
            },
          ],
        }),
      },
      employee: { findMany, count },
    };
    const quota = {
      getSnapshot: jest.fn().mockResolvedValue({ used: 0, limit: 25 }),
      toResponse: jest.fn().mockReturnValue({ used: 0, limit: 25 }),
    };
    const service = new EmployeesService(
      {
        forTenant: (callback: (client: typeof tx) => unknown) => callback(tx),
      } as unknown as PrismaService,
      { tenantId: 'tenant-1' } as TenantContextService,
      quota as unknown as EmployeeQuotaService,
      {} as AuditService,
    );

    await service.list(
      { quickFilter: EmployeeQuickFilter.JOINING_SOON },
      'admin-user-1',
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          dateOfJoining: {
            gt: expect.any(Date) as unknown,
            lte: expect.any(Date) as unknown,
          },
        }) as unknown,
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: 'ACTIVE',
        dateOfJoining: {
          gt: expect.any(Date) as unknown,
          lte: expect.any(Date) as unknown,
        },
      }) as unknown,
    });
  });
});

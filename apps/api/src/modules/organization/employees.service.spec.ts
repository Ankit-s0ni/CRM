import { AuditService } from '../../shared/audit/audit.service';
import type { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { EmployeeQuotaService } from './employee-quota.service';
import { EmployeesService } from './employees.service';

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
});

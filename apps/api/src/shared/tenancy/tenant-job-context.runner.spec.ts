import { BadRequestException } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantJobContextRunner } from './tenant-job-context.runner';

describe('TenantJobContextRunner', () => {
  const context = new TenantContextService();
  const runner = new TenantJobContextRunner();

  it('restores tenant context while a job is running', async () => {
    const tenantId = '019f6a51-7d5e-708b-8851-e66c242884f5';

    const resolvedTenantId = await runner.run({ tenantId }, () =>
      Promise.resolve(context.tenantId),
    );

    expect(resolvedTenantId).toBe(tenantId);
    expect(context.tenantId).toBeUndefined();
  });

  it('rejects jobs without tenant identity', () => {
    expect(() =>
      runner.run({ tenantId: '' }, () => Promise.resolve(undefined)),
    ).toThrow(BadRequestException);
  });
});

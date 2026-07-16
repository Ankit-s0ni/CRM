import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

export interface TenantJobData {
  tenantId: string;
}

@Injectable()
export class TenantJobContextRunner {
  run<T>(job: TenantJobData, handler: () => Promise<T>) {
    if (!job.tenantId) {
      throw new BadRequestException({
        code: 'JOB_TENANT_REQUIRED',
        message: 'Tenant job is missing tenantId',
      });
    }

    return TenantContextService.run({ tenantId: job.tenantId }, handler);
  }
}

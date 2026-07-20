import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantJobContextRunner } from './tenant-job-context.runner';

@Global()
@Module({
  providers: [TenantContextService, TenantJobContextRunner],
  exports: [TenantContextService, TenantJobContextRunner],
})
export class TenancyModule {}

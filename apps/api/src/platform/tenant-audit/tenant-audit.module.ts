import { Module } from '@nestjs/common';
import { TenantAuditController } from './tenant-audit.controller';
import { TenantAuditService } from './tenant-audit.service';

@Module({
  controllers: [TenantAuditController],
  providers: [TenantAuditService],
})
export class TenantAuditModule {}

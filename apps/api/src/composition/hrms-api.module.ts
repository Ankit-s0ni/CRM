import { Module } from '@nestjs/common';
import { AuditModule } from '../platform/audit/public';
import { ImpersonationJwtStrategy } from '../platform/control-plane/public';
import { TenantAuthenticationModule } from '../platform/identity/public';
import { OrganizationModule } from '../platform/organization/public';
import { ProductPlatformAdapterModule } from '../platform/product-integration/public';
import { WorkspaceProductModule } from '../platform/workspace/public';
import { HrmsProductModule } from '../products/hrms/public';
import { ApiFoundationModule } from '../shared/bootstrap/api-foundation.module';

@Module({
  imports: [
    ApiFoundationModule,
    TenantAuthenticationModule,
    ProductPlatformAdapterModule,
    AuditModule,
    WorkspaceProductModule,
    OrganizationModule,
    HrmsProductModule,
  ],
  providers: [ImpersonationJwtStrategy],
})
export class HrmsApiModule {}

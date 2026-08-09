import { Module } from '@nestjs/common';
import { AccessModule } from '../platform/access/public';
import { AuditModule } from '../platform/audit/public';
import { BillingModule } from '../platform/billing/public';
import { PlatformControlPlaneModule } from '../platform/control-plane/public';
import { IdentityModule } from '../platform/identity/public';
import { NotificationsModule } from '../platform/notifications/public';
import { ProductIntegrationModule } from '../platform/product-integration/public';
import { WorkspaceProductModule } from '../platform/workspace/public';
import { ApiFoundationModule } from '../shared/bootstrap/api-foundation.module';

@Module({
  imports: [
    ApiFoundationModule,
    IdentityModule,
    WorkspaceProductModule,
    AccessModule,
    AuditModule,
    NotificationsModule,
    BillingModule,
    PlatformControlPlaneModule,
    ProductIntegrationModule,
  ],
})
export class PlatformApiModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityModule } from './platform/identity/public';
import { WorkspaceProductModule } from './platform/workspace/public';
import { OrganizationModule } from './platform/organization/public';
import { AccessModule } from './platform/access/public';
import { AuditModule } from './platform/audit/public';
import { NotificationsModule } from './platform/notifications/public';
import { BillingModule } from './platform/billing/public';
import { HrmsProductModule } from './products/hrms/public';
import { PlatformControlPlaneModule } from './platform/control-plane/public';
import { ProductIntegrationModule } from './platform/product-integration/public';
import { ApiFoundationModule } from './shared/bootstrap/api-foundation.module';

@Module({
  imports: [
    ApiFoundationModule,
    IdentityModule,
    WorkspaceProductModule,
    OrganizationModule,
    AccessModule,
    AuditModule,
    PlatformControlPlaneModule,
    ProductIntegrationModule,
    HrmsProductModule,
    NotificationsModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { BillingModule } from './platform/billing/public';
import { DunningWorker } from './platform/billing/application/dunning.worker';
import { PlatformControlPlaneModule } from './platform/control-plane/public';
import { TenantDeletionWorker } from './platform/control-plane/tenants/tenant-deletion.worker';
import { NotificationsModule } from './platform/notifications/public';
import { NotificationEventWorker } from './platform/notifications/notification-event.worker';
import { ApiFoundationModule } from './shared/bootstrap/api-foundation.module';

@Module({
  imports: [
    ApiFoundationModule,
    NotificationsModule,
    BillingModule,
    PlatformControlPlaneModule,
  ],
  providers: [NotificationEventWorker, DunningWorker, TenantDeletionWorker],
})
export class PlatformWorkerModule {}

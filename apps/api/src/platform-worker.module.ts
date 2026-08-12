import { Module } from '@nestjs/common';
import { BillingModule } from './platform/billing/public';
import { DunningWorker } from './platform/billing/application/dunning.worker';
import { PlatformControlPlaneModule } from './platform/control-plane/public';
import { NotificationsModule } from './platform/notifications/public';
import { NotificationEventWorker } from './platform/notifications/notification-event.worker';
import { ApiFoundationModule } from './shared/bootstrap/api-foundation.module';
import { OutboxRelayService } from './shared/events/outbox-relay.service';
import { DataRetentionWorker } from './shared/retention/data-retention.worker';
import { RetentionModule } from './shared/retention/retention.module';

@Module({
  imports: [
    ApiFoundationModule,
    NotificationsModule,
    BillingModule,
    PlatformControlPlaneModule,
    RetentionModule,
  ],
  providers: [
    NotificationEventWorker,
    DunningWorker,
    OutboxRelayService,
    DataRetentionWorker,
  ],
})
export class PlatformWorkerModule {}

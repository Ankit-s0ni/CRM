import { Module } from '@nestjs/common';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import {
  ConfiguredEmailNotificationAdapter,
  ConfiguredPushNotificationAdapter,
  EMAIL_NOTIFICATION_PORT,
  PUSH_NOTIFICATION_PORT,
} from './notification-provider.port';
import { NotificationRendererService } from './notification-renderer.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TransactionalEmailService } from './transactional-email.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRendererService,
    NotificationDispatcherService,
    ConfiguredPushNotificationAdapter,
    ConfiguredEmailNotificationAdapter,
    TransactionalEmailService,
    {
      provide: PUSH_NOTIFICATION_PORT,
      useExisting: ConfiguredPushNotificationAdapter,
    },
    {
      provide: EMAIL_NOTIFICATION_PORT,
      useExisting: ConfiguredEmailNotificationAdapter,
    },
  ],
  exports: [NotificationDispatcherService, TransactionalEmailService],
})
export class NotificationsModule {}

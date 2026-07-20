import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import {
  NotificationDispatcherService,
  type NotificationEventTask,
} from './notification-dispatcher.service';

@Injectable()
export class NotificationEventWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<NotificationEventTask>;

  constructor(private readonly dispatcher: NotificationDispatcherService) {}

  onModuleInit() {
    if (
      process.env.NOTIFICATION_QUEUE_MODE === 'disabled' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }
    const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
    this.worker = new Worker<NotificationEventTask>(
      'notification-events',
      (job: Job<NotificationEventTask>) => this.dispatcher.process(job.data),
      {
        connection: {
          host: url.hostname,
          port: Number(url.port || 6379),
          username: url.username || undefined,
          password: url.password || undefined,
          db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
        },
        concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY ?? 8),
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}

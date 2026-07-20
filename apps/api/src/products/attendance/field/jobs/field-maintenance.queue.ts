import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

export type FieldMaintenanceTask = { kind: 'maintenance' };

@Injectable()
export class FieldMaintenanceQueue implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue<FieldMaintenanceTask>;

  async onModuleInit() {
    if (
      process.env.FIELD_QUEUE_MODE === 'disabled' ||
      process.env.NODE_ENV === 'test'
    )
      return;
    this.queue = new Queue('field-maintenance', {
      connection: this.connection(),
    });
    await this.queue.upsertJobScheduler(
      'field-maintenance-hourly',
      { every: 60 * 60_000 },
      { name: 'maintenance', data: { kind: 'maintenance' } },
    );
  }

  connection() {
    const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    };
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }
}

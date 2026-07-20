import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { FieldPingProcessor } from './field-ping.processor';

export type FieldPingTask = {
  tenantId: string;
  employeeId: string;
  deviceId: string;
  receiptIds: string[];
};

@Injectable()
export class FieldPingQueue implements OnModuleDestroy {
  private queue?: Queue<FieldPingTask>;

  constructor(private readonly processor: FieldPingProcessor) {}

  async enqueue(task: FieldPingTask) {
    if (this.inline()) return this.processor.process(task);
    if (process.env.FIELD_QUEUE_MODE === 'disabled') {
      throw new Error('FIELD_QUEUE_DISABLED');
    }
    this.queue ??= new Queue('field-ping-ingestion', {
      connection: this.connection(),
    });
    return this.queue.add('ingest', task, {
      jobId: `field-${task.tenantId}-${task.receiptIds[0]}`,
      attempts: 8,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: 1_000,
      removeOnFail: 2_000,
    });
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

  private inline() {
    return (
      process.env.FIELD_QUEUE_MODE === 'inline' ||
      process.env.NODE_ENV === 'test'
    );
  }
}

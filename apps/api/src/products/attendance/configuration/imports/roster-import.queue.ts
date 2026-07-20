import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  RosterImportProcessor,
  RosterImportTask,
} from './roster-import.processor';

@Injectable()
export class RosterImportQueue implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue<RosterImportTask>;
  constructor(private readonly processor: RosterImportProcessor) {}

  onModuleInit() {
    if (!this.inlineMode())
      this.queue = new Queue('roster-imports', {
        connection: this.connection(),
      });
  }
  async enqueue(data: RosterImportTask) {
    if (this.inlineMode()) return this.processor.process(data);
    await this.queue!.add('process', data, {
      jobId: `${data.tenantId}-${data.importJobId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }
  async onModuleDestroy() {
    await this.queue?.close();
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
  private inlineMode() {
    return process.env.IMPORT_QUEUE_MODE
      ? process.env.IMPORT_QUEUE_MODE === 'inline'
      : process.env.NODE_ENV === 'test';
  }
}

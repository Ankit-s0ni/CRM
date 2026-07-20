import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ReportTask, ReportingProcessor } from './reporting.processor';

@Injectable()
export class ReportingQueue implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue<ReportTask>;

  constructor(private readonly processor: ReportingProcessor) {}

  onModuleInit() {
    if (this.inlineMode()) return;
    this.queue = new Queue<ReportTask>('report-exports', {
      connection: this.connection(),
    });
  }

  async enqueue(task: ReportTask) {
    if (this.inlineMode()) return this.processor.process(task);
    await this.queue!.add('generate', task, {
      jobId: task.reportId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500,
      removeOnFail: 500,
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

  private inlineMode() {
    return (
      process.env.REPORT_QUEUE_MODE === 'inline' ||
      process.env.NODE_ENV === 'test'
    );
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { EmployeeImportProcessor } from './employee-import.processor';

export type EmployeeImportJobData = { tenantId: string; importJobId: string };

@Injectable()
export class EmployeeImportQueue implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue<EmployeeImportJobData>;
  private worker?: Worker<EmployeeImportJobData>;

  constructor(private readonly processor: EmployeeImportProcessor) {}

  onModuleInit() {
    if (this.inlineMode()) return;
    const connection = this.connection();
    this.queue = new Queue<EmployeeImportJobData>('employee-imports', {
      connection,
    });
    this.worker = new Worker<EmployeeImportJobData>(
      'employee-imports',
      (job: Job<EmployeeImportJobData>) => this.processor.process(job.data),
      { connection, concurrency: 2 },
    );
  }

  async enqueue(data: EmployeeImportJobData) {
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
    await this.worker?.close();
    await this.queue?.close();
  }

  private inlineMode() {
    if (process.env.IMPORT_QUEUE_MODE) {
      return process.env.IMPORT_QUEUE_MODE === 'inline';
    }
    return process.env.NODE_ENV === 'test';
  }

  private connection() {
    const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    };
  }
}

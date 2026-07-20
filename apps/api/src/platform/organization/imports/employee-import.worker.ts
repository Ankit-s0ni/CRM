import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import {
  EmployeeImportJobData,
  EmployeeImportQueue,
} from './employee-import.queue';
import { EmployeeImportProcessor } from './employee-import.processor';

@Injectable()
export class EmployeeImportWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<EmployeeImportJobData>;

  constructor(
    private readonly queue: EmployeeImportQueue,
    private readonly processor: EmployeeImportProcessor,
  ) {}

  onModuleInit() {
    if (process.env.IMPORT_QUEUE_MODE === 'inline') return;

    this.worker = new Worker<EmployeeImportJobData>(
      'employee-imports',
      (job: Job<EmployeeImportJobData>) => this.processor.process(job.data),
      {
        connection: this.queue.connection(),
        concurrency: Number(process.env.IMPORT_WORKER_CONCURRENCY ?? 2),
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}

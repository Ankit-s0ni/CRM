import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import {
  RosterImportProcessor,
  RosterImportTask,
} from './roster-import.processor';
import { RosterImportQueue } from './roster-import.queue';

@Injectable()
export class RosterImportWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<RosterImportTask>;
  constructor(
    private readonly queue: RosterImportQueue,
    private readonly processor: RosterImportProcessor,
  ) {}
  onModuleInit() {
    if (process.env.IMPORT_QUEUE_MODE === 'inline') return;
    this.worker = new Worker(
      'roster-imports',
      (job: Job<RosterImportTask>) => this.processor.process(job.data),
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

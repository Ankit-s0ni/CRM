import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ReportTask, ReportingProcessor } from './reporting.processor';
import { ReportingQueue } from './reporting.queue';

@Injectable()
export class ReportingWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<ReportTask>;

  constructor(
    private readonly queue: ReportingQueue,
    private readonly processor: ReportingProcessor,
  ) {}

  onModuleInit() {
    if (
      process.env.REPORT_QUEUE_MODE === 'inline' ||
      process.env.NODE_ENV === 'test'
    )
      return;
    this.worker = new Worker<ReportTask>(
      'report-exports',
      (job: Job<ReportTask>) => this.processor.process(job.data),
      {
        connection: this.queue.connection(),
        concurrency: Number(process.env.REPORT_WORKER_CONCURRENCY ?? 2),
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}

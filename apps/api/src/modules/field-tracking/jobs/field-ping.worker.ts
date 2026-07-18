import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { FieldPingProcessor } from './field-ping.processor';
import { FieldPingQueue, FieldPingTask } from './field-ping.queue';

@Injectable()
export class FieldPingWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<FieldPingTask>;

  constructor(
    private readonly queue: FieldPingQueue,
    private readonly processor: FieldPingProcessor,
  ) {}

  onModuleInit() {
    if (
      process.env.FIELD_QUEUE_MODE === 'disabled' ||
      process.env.FIELD_QUEUE_MODE === 'inline' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }
    this.worker = new Worker(
      'field-ping-ingestion',
      (job: Job<FieldPingTask>) => this.processor.process(job.data),
      {
        connection: this.queue.connection(),
        concurrency: Number(process.env.FIELD_WORKER_CONCURRENCY ?? 8),
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}

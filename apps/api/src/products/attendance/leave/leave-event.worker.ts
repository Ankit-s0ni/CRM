import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import {
  LeaveApprovedProcessor,
  LeaveEventTask,
} from './leave-approved.processor';
import { LeaveEventQueue } from './leave-event.queue';

@Injectable()
export class LeaveEventWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<LeaveEventTask>;

  constructor(
    private readonly queue: LeaveEventQueue,
    private readonly processor: LeaveApprovedProcessor,
  ) {}

  onModuleInit() {
    if (
      process.env.LEAVE_EVENT_QUEUE_MODE === 'disabled' ||
      process.env.NODE_ENV === 'test'
    )
      return;
    this.worker = new Worker<LeaveEventTask>(
      'leave-events',
      (job: Job<LeaveEventTask>) => this.processor.process(job.data),
      {
        connection: this.queue.connection(),
        concurrency: Number(process.env.LEAVE_EVENT_WORKER_CONCURRENCY ?? 2),
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}

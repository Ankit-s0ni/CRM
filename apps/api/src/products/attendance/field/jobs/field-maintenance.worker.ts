import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import {
  FieldMaintenanceQueue,
  FieldMaintenanceTask,
} from './field-maintenance.queue';
import { FieldMaintenanceService } from './field-maintenance.service';

@Injectable()
export class FieldMaintenanceWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<FieldMaintenanceTask>;

  constructor(
    private readonly queue: FieldMaintenanceQueue,
    private readonly maintenance: FieldMaintenanceService,
  ) {}

  onModuleInit() {
    if (
      process.env.FIELD_QUEUE_MODE === 'disabled' ||
      process.env.FIELD_QUEUE_MODE === 'inline' ||
      process.env.NODE_ENV === 'test'
    )
      return;
    this.worker = new Worker(
      'field-maintenance',
      () => this.maintenance.run(),
      { connection: this.queue.connection(), concurrency: 1 },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}

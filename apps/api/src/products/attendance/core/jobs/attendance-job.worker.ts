import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { AttendanceJobProcessor } from './attendance-job.processor';
import { AttendanceJobQueue, AttendanceJobTask } from './attendance-job.queue';
import { AttendanceJobScheduler } from './attendance-job.scheduler';

@Injectable()
export class AttendanceJobWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<AttendanceJobTask>;

  constructor(
    private readonly queue: AttendanceJobQueue,
    private readonly processor: AttendanceJobProcessor,
    private readonly scheduler: AttendanceJobScheduler,
  ) {}

  onModuleInit() {
    if (
      process.env.ATTENDANCE_QUEUE_MODE === 'disabled' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }
    this.worker = new Worker(
      'attendance-runtime',
      (job: Job<AttendanceJobTask>) => this.process(job.data),
      {
        connection: this.queue.connection(),
        concurrency: Number(process.env.ATTENDANCE_WORKER_CONCURRENCY ?? 4),
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private process(task: AttendanceJobTask) {
    if (task.kind === 'schedule') return this.scheduler.dispatch();
    if (task.kind === 'ensure-partitions') {
      return this.processor.ensurePartitions(task.referenceMonth);
    }
    if (task.kind === 'finalize-day') {
      return this.processor.finalizeDay(task.tenantId, task.attendanceDate);
    }
    return this.processor.absenteeSweep(task.tenantId, task.attendanceDate);
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

export type AttendanceJobTask =
  | { kind: 'schedule' }
  | {
      kind: 'finalize-day' | 'absentee-sweep';
      tenantId: string;
      attendanceDate: string;
    }
  | { kind: 'ensure-partitions'; referenceMonth: string };

@Injectable()
export class AttendanceJobQueue implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue<AttendanceJobTask>;

  async onModuleInit() {
    if (this.disabled()) return;
    this.queue = new Queue('attendance-runtime', {
      connection: this.connection(),
    });
    await this.queue.upsertJobScheduler(
      'attendance-schedule-five-minutes',
      { every: 5 * 60_000 },
      { name: 'schedule', data: { kind: 'schedule' } },
    );
  }

  enqueueTenant(
    kind: 'finalize-day' | 'absentee-sweep',
    tenantId: string,
    attendanceDate: string,
  ) {
    if (this.disabled()) return Promise.resolve();
    return this.queue!.add(
      kind,
      { kind, tenantId, attendanceDate },
      {
        jobId: `${kind}-${tenantId}-${attendanceDate}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    );
  }

  enqueuePartitions(referenceMonth: string) {
    if (this.disabled()) return Promise.resolve();
    return this.queue!.add(
      'ensure-partitions',
      { kind: 'ensure-partitions', referenceMonth },
      {
        jobId: `ensure-partitions-${referenceMonth}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 24,
        removeOnFail: 24,
      },
    );
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

  private disabled() {
    return (
      process.env.ATTENDANCE_QUEUE_MODE === 'disabled' ||
      process.env.NODE_ENV === 'test'
    );
  }
}

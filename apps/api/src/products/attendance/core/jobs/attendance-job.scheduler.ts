import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { AttendanceJobQueue } from './attendance-job.queue';

@Injectable()
export class AttendanceJobScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: AttendanceJobQueue,
  ) {}

  async dispatch(now = new Date()) {
    const tenants = await this.prisma.forAdmin((tx) =>
      tx.tenant.findMany({
        where: { status: { in: ['TRIAL', 'ACTIVE'] } },
        include: { settings: true },
      }),
    );
    for (const tenant of tenants) {
      const timezone = tenant.settings?.timezone ?? 'UTC';
      const local = DateTime.fromJSDate(now, { zone: timezone });
      if (local.hour >= 1) {
        await this.queue.enqueueTenant(
          'finalize-day',
          tenant.id,
          local.minus({ days: 1 }).toISODate()!,
        );
      }
      const alertTime = tenant.settings?.absenteeAlertTime ?? '10:00';
      if (local.toFormat('HH:mm') >= alertTime) {
        await this.queue.enqueueTenant(
          'absentee-sweep',
          tenant.id,
          local.toISODate()!,
        );
      }
    }
    const utc = DateTime.fromJSDate(now, { zone: 'utc' });
    if (utc.day >= 25)
      await this.queue.enqueuePartitions(utc.toFormat('yyyy-MM'));
    return { tenants: tenants.length };
  }
}

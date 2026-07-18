import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantJobContextRunner } from '../../../shared/tenancy/tenant-job-context.runner';

@Injectable()
export class FieldMaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: TenantJobContextRunner,
  ) {}

  async run(now = new Date()) {
    const tenants = await this.prisma.forAdmin((tx) =>
      tx.tenant.findMany({
        where: { status: { in: ['TRIAL', 'ACTIVE'] } },
        select: {
          id: true,
          settings: { select: { fieldTrackingIntervalMin: true } },
        },
      }),
    );
    let staleClosed = 0;
    let pingsDeleted = 0;
    let routesAnonymized = 0;
    for (const tenant of tenants) {
      const result = await this.runner.run({ tenantId: tenant.id }, () =>
        this.prisma.forTenant(async (tx) => {
          const interval = tenant.settings?.fieldTrackingIntervalMin ?? 15;
          const staleBefore = new Date(
            now.getTime() - Math.max(10, interval * 3) * 60_000,
          );
          const retainedAfter = new Date(now.getTime() - 90 * 24 * 60 * 60_000);
          const closed = await tx.fieldTrackingSession.updateMany({
            where: {
              endedAt: null,
              OR: [
                { lastPingAt: { lt: staleBefore } },
                { lastPingAt: null, startedAt: { lt: staleBefore } },
              ],
            },
            data: { endedAt: now, endReason: 'STALE' },
          });
          const deleted = await this.prisma.forAdmin((admin) =>
            admin.fieldLocationPing.deleteMany({
              where: {
                tenantId: tenant.id,
                capturedAt: { lt: retainedAfter },
              },
            }),
          );
          const anonymized = await tx.fieldRouteSummary.updateMany({
            where: {
              routeDate: { lt: retainedAfter },
              NOT: { simplifiedPath: { equals: [] } },
            },
            data: { simplifiedPath: [], stops: [], gaps: [] },
          });
          return {
            closed: closed.count,
            deleted: deleted.count,
            anonymized: anonymized.count,
          };
        }),
      );
      staleClosed += result.closed;
      pingsDeleted += result.deleted;
      routesAnonymized += result.anonymized;
    }
    await this.ensurePartitions(now);
    return {
      tenants: tenants.length,
      staleClosed,
      pingsDeleted,
      routesAnonymized,
    };
  }

  async ensurePartitions(now = new Date()) {
    const reference = DateTime.fromJSDate(now, { zone: 'utc' }).startOf(
      'month',
    );
    for (let offset = 1; offset <= 2; offset += 1) {
      const start = reference.plus({ months: offset });
      const end = start.plus({ months: 1 });
      const suffix = start.toFormat('yyyy_MM');
      if (!/^\d{4}_\d{2}$/.test(suffix))
        throw new Error('PARTITION_NAME_INVALID');
      await this.prisma.forAdmin((tx) =>
        tx.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS field_location_pings_${suffix} PARTITION OF field_location_pings FOR VALUES FROM ('${start.toISODate()}') TO ('${end.toISODate()}')`,
        ),
      );
    }
  }
}

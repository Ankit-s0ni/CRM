import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantJobContextRunner } from '../../../shared/tenancy/tenant-job-context.runner';
import { FieldMaintenanceService } from './field-maintenance.service';

describe('FieldMaintenanceService', () => {
  it('closes stale sessions, applies retention, and is idempotent', async () => {
    const tenantFindMany = jest.fn().mockResolvedValue([
      {
        id: 'tenant-1',
        settings: { fieldTrackingIntervalMin: 5 },
      },
    ]);
    const deleteMany = jest
      .fn()
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 0 });
    const executeRawUnsafe = jest.fn().mockResolvedValue(0);
    const adminTx = {
      tenant: { findMany: tenantFindMany },
      fieldLocationPing: { deleteMany },
      $executeRawUnsafe: executeRawUnsafe,
    } as unknown as PrismaTransaction;
    const sessionUpdateMany = jest
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const routeUpdateMany = jest
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const tenantTx = {
      fieldTrackingSession: { updateMany: sessionUpdateMany },
      fieldRouteSummary: { updateMany: routeUpdateMany },
    } as unknown as PrismaTransaction;
    const prisma = {
      forAdmin: jest.fn((handler: (tx: PrismaTransaction) => unknown) =>
        handler(adminTx),
      ),
      forTenant: jest.fn((handler: (tx: PrismaTransaction) => unknown) =>
        handler(tenantTx),
      ),
    } as unknown as PrismaService;
    const runner = {
      run: jest.fn(
        (_job: { tenantId: string }, handler: () => Promise<unknown>) =>
          handler(),
      ),
    } as unknown as TenantJobContextRunner;
    const service = new FieldMaintenanceService(prisma, runner);
    const now = new Date('2026-07-17T12:00:00.000Z');

    await expect(service.run(now)).resolves.toEqual({
      tenants: 1,
      staleClosed: 1,
      pingsDeleted: 2,
      routesAnonymized: 1,
    });
    await expect(service.run(now)).resolves.toEqual({
      tenants: 1,
      staleClosed: 0,
      pingsDeleted: 0,
      routesAnonymized: 0,
    });

    const staleCutoff = new Date('2026-07-17T11:45:00.000Z');
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: {
        endedAt: null,
        OR: [
          { lastPingAt: { lt: staleCutoff } },
          { lastPingAt: null, startedAt: { lt: staleCutoff } },
        ],
      },
      data: { endedAt: now, endReason: 'STALE' },
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        capturedAt: { lt: new Date('2026-04-18T12:00:00.000Z') },
      },
    });
    expect(routeUpdateMany).toHaveBeenCalledWith({
      where: {
        routeDate: { lt: new Date('2026-04-18T12:00:00.000Z') },
        NOT: { simplifiedPath: { equals: [] } },
      },
      data: { simplifiedPath: [], stops: [], gaps: [] },
    });
  });

  it('creates the next two monthly partitions across a year boundary', async () => {
    const executeRawUnsafe = jest.fn().mockResolvedValue(0);
    const adminTx = {
      $executeRawUnsafe: executeRawUnsafe,
    } as unknown as PrismaTransaction;
    const prisma = {
      forAdmin: jest.fn((handler: (tx: PrismaTransaction) => unknown) =>
        handler(adminTx),
      ),
    } as unknown as PrismaService;
    const service = new FieldMaintenanceService(
      prisma,
      {} as TenantJobContextRunner,
    );

    await service.ensurePartitions(new Date('2026-12-15T23:30:00.000Z'));

    expect(executeRawUnsafe).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('field_location_pings_2027_01'),
    );
    expect(executeRawUnsafe).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FROM ('2027-01-01') TO ('2027-02-01')"),
    );
    expect(executeRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('field_location_pings_2027_02'),
    );
    expect(executeRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FROM ('2027-02-01') TO ('2027-03-01')"),
    );
  });
});

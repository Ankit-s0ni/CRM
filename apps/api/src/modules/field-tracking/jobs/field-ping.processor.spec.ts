import { FieldIngestionStatus } from '@prisma/client';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TenantJobContextRunner } from '../../../shared/tenancy/tenant-job-context.runner';
import { FieldPresenceService } from '../field-presence.service';
import { FieldRouteService } from '../route/field-route.service';
import { FieldPingProcessor } from './field-ping.processor';

describe('FieldPingProcessor', () => {
  it('does not duplicate a ping, presence event, or route rebuild on retry', async () => {
    const receipt = {
      id: 'receipt-1',
      sessionId: 'session-1',
      employeeId: 'employee-1',
      deviceId: 'device-1',
      clientPingUuid: 'ping-1',
      capturedAt: new Date('2026-07-17T06:00:00.000Z'),
      payload: {
        sessionId: 'session-1',
        latitude: 23.588,
        longitude: 58.382,
        accuracyM: 8,
        speedMps: 2,
        batteryLevel: 80,
        isMock: false,
        capturedAt: '2026-07-17T06:00:00.000Z',
        isOfflineSync: true,
      },
    };
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([receipt])
      .mockResolvedValueOnce([]);
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const receiptUpdate = jest.fn().mockResolvedValue({});
    const sessionUpdate = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      fieldPingReceipt: { findMany, update: receiptUpdate },
      fieldLocationPing: { createMany },
      fieldTrackingSession: { updateMany: sessionUpdate },
    } as unknown as PrismaTransaction;
    const prisma = {
      forTenant: jest.fn((handler: (tx: PrismaTransaction) => unknown) =>
        handler(tx),
      ),
    } as unknown as PrismaService;
    const runner = {
      run: jest.fn(
        (_job: { tenantId: string }, handler: () => Promise<unknown>) =>
          handler(),
      ),
    } as unknown as TenantJobContextRunner;
    const presencePublish = jest.fn().mockResolvedValue('event-1');
    const presence = {
      publish: presencePublish,
    } as unknown as FieldPresenceService;
    const routeRebuild = jest.fn().mockResolvedValue({ id: 'route-1' });
    const routes = {
      rebuildForInstant: routeRebuild,
    } as unknown as FieldRouteService;
    const processor = new FieldPingProcessor(prisma, runner, presence, routes);
    const task = {
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      deviceId: 'device-1',
      receiptIds: ['receipt-1'],
    };

    await expect(processor.process(task)).resolves.toEqual({
      processed: 1,
      published: 1,
    });
    await expect(processor.process(task)).resolves.toEqual({
      processed: 0,
      published: 0,
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['receipt-1'] },
        employeeId: 'employee-1',
        deviceId: 'device-1',
        status: FieldIngestionStatus.PENDING,
      },
      orderBy: [{ capturedAt: 'asc' }, { clientPingUuid: 'asc' }],
    });
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(receiptUpdate).toHaveBeenCalledTimes(1);
    expect(sessionUpdate).toHaveBeenCalledTimes(1);
    expect(presencePublish).toHaveBeenCalledTimes(1);
    expect(routeRebuild).toHaveBeenCalledTimes(1);
  });
});

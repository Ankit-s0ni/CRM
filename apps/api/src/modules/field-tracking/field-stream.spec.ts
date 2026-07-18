import { EMPTY, Subject, firstValueFrom, filter, take } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import {
  FieldPresenceService,
  FieldStreamEvent,
} from './field-presence.service';
import { FieldRouteService } from './route/field-route.service';

describe('field tracking SSE', () => {
  it('never emits another tenant local presence event', async () => {
    const previousMode = process.env.FIELD_REDIS_MODE;
    process.env.FIELD_REDIS_MODE = 'disabled';
    const presence = new FieldPresenceService();
    const next = firstValueFrom(presence.localStream('tenant-a').pipe(take(1)));

    await presence.publish('tenant-b', point('outside'));
    await presence.publish('tenant-a', point('inside'));

    const received = await next;
    expect(received.tenantId).toBe('tenant-a');
    expect(received.data.employeeId).toBe('inside');
    presence.onModuleDestroy();
    restoreEnv('FIELD_REDIS_MODE', previousMode);
  });

  it('resumes from the supplied cursor and filters manager scope', async () => {
    const events = new Subject<FieldStreamEvent>();
    const redisStream = jest.fn(() => EMPTY);
    const presence = {
      localStream: jest.fn(() => events.asObservable()),
      redisStream,
    } as unknown as FieldPresenceService;
    const service = new FieldRouteService(
      scopedPrisma('ACTIVE'),
      context(),
      presence,
    );
    const stream = await service.stream(user(), '1784299000000-2');
    const next = firstValueFrom(
      stream.pipe(
        filter((event) => event.type === 'location'),
        take(1),
      ),
    );

    events.next(streamEvent('outside'));
    events.next(streamEvent('report'));

    const received = await next;
    expect(received.id).toBe('event-report');
    expect(received.type).toBe('location');
    expect(received.data).toEqual(point('report'));
    expect(redisStream).toHaveBeenCalledWith('tenant-a', '1784299000000-2');
  });

  it('closes an existing connection when the user is disabled', async () => {
    const events = new Subject<FieldStreamEvent>();
    const presence = {
      localStream: jest.fn(() => events.asObservable()),
      redisStream: jest.fn(() => EMPTY),
    } as unknown as FieldPresenceService;
    const service = new FieldRouteService(
      scopedPrisma('SUSPENDED'),
      context(),
      presence,
    );
    const stream = await service.stream(user());

    await expect(completes(stream)).resolves.toBeUndefined();
  });

  it('closes immediately when the access token has expired', async () => {
    const events = new Subject<FieldStreamEvent>();
    const presence = {
      localStream: jest.fn(() => events.asObservable()),
      redisStream: jest.fn(() => EMPTY),
    } as unknown as FieldPresenceService;
    const service = new FieldRouteService(
      scopedPrisma('ACTIVE'),
      context(),
      presence,
    );
    const stream = await service.stream({
      ...user(),
      exp: Math.floor(Date.now() / 1_000) - 1,
    });

    await expect(completes(stream)).resolves.toBeUndefined();
  });
});

function scopedPrisma(status: 'ACTIVE' | 'SUSPENDED') {
  const tenantTx = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        roles: [{ role: { name: 'MANAGER' } }],
      }),
    },
    employee: {
      findFirst: jest.fn().mockResolvedValue({ id: 'manager' }),
      findMany: jest.fn().mockResolvedValue([
        { id: 'manager', managerId: null },
        { id: 'report', managerId: 'manager' },
        { id: 'outside', managerId: null },
      ]),
    },
  } as unknown as PrismaTransaction;
  const adminTx = {
    user: { findFirst: jest.fn().mockResolvedValue({ status }) },
    registeredDevice: {
      findFirst: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
    },
  } as unknown as PrismaTransaction;
  return {
    forTenant: jest.fn((handler: (tx: PrismaTransaction) => unknown) =>
      handler(tenantTx),
    ),
    forAdmin: jest.fn((handler: (tx: PrismaTransaction) => unknown) =>
      handler(adminTx),
    ),
  } as unknown as PrismaService;
}

function context() {
  return {
    tenantId: 'tenant-a',
    userId: 'user-a',
  } as unknown as TenantContextService;
}

function user(): AuthenticatedUser {
  return {
    userId: 'user-a',
    tenantId: 'tenant-a',
    email: 'manager@example.test',
    roles: ['MANAGER'],
    deviceId: 'device-a',
    exp: Math.floor(Date.now() / 1_000) + 3_600,
  };
}

function point(employeeId: string) {
  return {
    employeeId,
    sessionId: `session-${employeeId}`,
    latitude: 23.588,
    longitude: 58.382,
    accuracyM: 8,
    speedMps: 2,
    batteryLevel: 80,
    capturedAt: '2026-07-17T06:00:00.000Z',
  };
}

function streamEvent(employeeId: string): FieldStreamEvent {
  return {
    id: `event-${employeeId}`,
    tenantId: 'tenant-a',
    event: 'location',
    data: point(employeeId),
  };
}

function completes(observable: import('rxjs').Observable<MessageEvent>) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('SSE connection did not close')),
      1_000,
    );
    observable.subscribe({
      error: reject,
      complete: () => {
        clearTimeout(timeout);
        resolve();
      },
    });
  });
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

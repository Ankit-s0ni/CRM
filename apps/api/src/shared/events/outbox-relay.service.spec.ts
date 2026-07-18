jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

import type { PrismaService } from '../database/prisma.service';
import { OutboxRelayService } from './outbox-relay.service';

type AddJob = (
  name: string,
  data: unknown,
  options: unknown,
) => Promise<unknown>;
type UpdateEvents = (args: unknown) => Promise<{ count: number }>;
type RelayInternals = {
  queue: { add: jest.MockedFunction<AddJob> };
  evidenceDeletionQueue: { add: jest.MockedFunction<AddJob> };
  publish(event: {
    id: string;
    tenantId: string | null;
    eventKey: string;
    payload: Record<string, string>;
    attemptCount: number;
  }): Promise<void>;
};

describe('OutboxRelayService', () => {
  const event = {
    id: '019f6a51-7d5e-708b-8851-e66c242884f5',
    tenantId: '019f6a51-7d5e-708b-8851-e66c242884f6',
    eventKey: 'organization.employee.created',
    payload: { employeeId: 'employee-id' },
    attemptCount: 0,
  };

  function setup(
    add: jest.MockedFunction<AddJob>,
    deletionAdd: jest.MockedFunction<AddJob> = jest
      .fn<Promise<unknown>, [string, unknown, unknown]>()
      .mockResolvedValue(undefined),
  ) {
    const updateMany: jest.MockedFunction<UpdateEvents> = jest
      .fn<Promise<{ count: number }>, [unknown]>()
      .mockResolvedValue({ count: 1 });
    type Transaction = { outboxEvent: { updateMany: UpdateEvents } };
    const prisma = {
      forAdmin: jest.fn((callback: (tx: Transaction) => Promise<unknown>) =>
        callback({ outboxEvent: { updateMany } }),
      ),
    } as unknown as PrismaService;
    const service = new OutboxRelayService(prisma);
    const relay = service as unknown as RelayInternals;
    relay.queue = { add };
    relay.evidenceDeletionQueue = { add: deletionAdd };
    return { relay, updateMany };
  }

  it('publishes with the event id as the BullMQ idempotency key', async () => {
    const add: jest.MockedFunction<AddJob> = jest
      .fn<Promise<unknown>, [string, unknown, unknown]>()
      .mockResolvedValue({ id: event.id });
    const { relay, updateMany } = setup(add);

    await relay.publish(event);

    const [name, data, options] = add.mock.calls[0] ?? [];
    expect(name).toBe(event.eventKey);
    expect(data).toMatchObject({ eventId: event.id });
    expect(options).toMatchObject({ jobId: event.id });
    const update = updateMany.mock.calls[0]?.[0] as {
      data: { publishedAt: Date };
    };
    expect(update.data.publishedAt).toBeInstanceOf(Date);
  });

  it('releases a failed event and schedules a retry', async () => {
    const { relay, updateMany } = setup(
      jest
        .fn<Promise<unknown>, [string, unknown, unknown]>()
        .mockRejectedValue(new Error('redis unavailable')),
    );

    await relay.publish(event);

    const update = updateMany.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(update.data).toMatchObject({
      attemptCount: 1,
      deadLetteredAt: null,
      lastError: 'redis unavailable',
      lockedAt: null,
      lockedBy: null,
    });
  });

  it('routes evidence deletion to a retryable retained queue', async () => {
    const add = jest
      .fn<Promise<unknown>, [string, unknown, unknown]>()
      .mockResolvedValue({ id: event.id });
    const deletionAdd = jest
      .fn<Promise<unknown>, [string, unknown, unknown]>()
      .mockResolvedValue({ id: event.id });
    const { relay } = setup(add, deletionAdd);

    await relay.publish({
      ...event,
      eventKey: 'attendance.biometric_evidence.deletion_requested',
      payload: { employeeId: 'employee-id', objectKeys: 'fixture' },
    });

    expect(deletionAdd).toHaveBeenCalledWith(
      'delete',
      expect.objectContaining({ eventId: event.id }),
      expect.objectContaining({
        jobId: event.id,
        attempts: 12,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnFail: false,
      }),
    );
  });

  it('dead-letters an event after the configured attempt limit', async () => {
    const previous = process.env.OUTBOX_MAX_ATTEMPTS;
    process.env.OUTBOX_MAX_ATTEMPTS = '2';
    const { relay, updateMany } = setup(
      jest
        .fn<Promise<unknown>, [string, unknown, unknown]>()
        .mockRejectedValue(new Error('still unavailable')),
    );

    await relay.publish({ ...event, attemptCount: 1 });

    const update = updateMany.mock.calls[0]?.[0] as {
      data: { attemptCount: number; deadLetteredAt: Date };
    };
    expect(update.data.attemptCount).toBe(2);
    expect(update.data.deadLetteredAt).toBeInstanceOf(Date);
    if (previous === undefined) delete process.env.OUTBOX_MAX_ATTEMPTS;
    else process.env.OUTBOX_MAX_ATTEMPTS = previous;
  });
});

import { DataRetentionService } from './data-retention.service';

describe('DataRetentionService', () => {
  it('purges only expired notifications and aged tokens in bounded batches', async () => {
    const notification = {
      findMany: jest.fn().mockResolvedValue([{ id: 'notification-1' }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const notificationDelivery = {
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
    };
    const verificationToken = {
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
    };
    const prisma = {
      forAdmin: (callback: (tx: unknown) => unknown) =>
        callback({ notification, notificationDelivery, verificationToken }),
    };
    const now = new Date('2026-07-18T12:00:00.000Z');

    await expect(
      new DataRetentionService(prisma as never).run(now),
    ).resolves.toEqual({
      notifications: 1,
      deliveries: 2,
      verificationTokens: 3,
      tokenCutoff: new Date('2026-07-11T12:00:00.000Z'),
    });
    expect(notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { expiresAt: { lt: now } },
        take: 1000,
      }),
    );
    expect(verificationToken.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lt: new Date('2026-07-11T12:00:00.000Z') } },
          {
            consumedAt: {
              not: null,
              lt: new Date('2026-07-11T12:00:00.000Z'),
            },
          },
        ],
      },
    });
  });
});

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DataRetentionService {
  constructor(private readonly prisma: PrismaService) {}

  async run(now = new Date()) {
    const tokenCutoff = new Date(
      now.getTime() - retentionDays('TOKEN_RETENTION_DAYS', 7) * 86_400_000,
    );
    const notificationIds = await this.prisma.forAdmin((tx) =>
      tx.notification.findMany({
        where: { expiresAt: { lt: now } },
        select: { id: true },
        orderBy: { expiresAt: 'asc' },
        take: batchSize(),
      }),
    );

    const notificationResult = await this.prisma.forAdmin(async (tx) => {
      const ids = notificationIds.map(({ id }) => id);
      if (!ids.length) return { notifications: 0, deliveries: 0 };
      const deliveries = await tx.notificationDelivery.deleteMany({
        where: { notificationId: { in: ids } },
      });
      const notifications = await tx.notification.deleteMany({
        where: { id: { in: ids }, expiresAt: { lt: now } },
      });
      return {
        notifications: notifications.count,
        deliveries: deliveries.count,
      };
    });

    const tokens = await this.prisma.forAdmin((tx) =>
      tx.verificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: tokenCutoff } },
            { consumedAt: { not: null, lt: tokenCutoff } },
          ],
        },
      }),
    );

    return {
      ...notificationResult,
      verificationTokens: tokens.count,
      tokenCutoff,
    };
  }
}

function retentionDays(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : fallback;
}

function batchSize() {
  const value = Number(process.env.RETENTION_BATCH_SIZE ?? 1_000);
  return Number.isFinite(value) && value >= 1
    ? Math.min(10_000, Math.floor(value))
    : 1_000;
}

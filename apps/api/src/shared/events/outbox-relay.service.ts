import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';

type ClaimedEvent = {
  id: string;
  tenantId: string | null;
  eventKey: string;
  payload: Prisma.JsonValue;
  attemptCount: number;
};

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly workerId = `${process.pid}-${randomUUID()}`;
  private readonly queue: Queue;
  private timer?: NodeJS.Timeout;
  private draining = false;

  constructor(private readonly prisma: PrismaService) {
    const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
    this.queue = new Queue('domain-events', {
      connection: {
        host: url.hostname,
        port: Number(url.port || 6379),
        username: url.username || undefined,
        password: url.password || undefined,
        db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
      },
    });
  }

  onModuleInit() {
    const interval = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1000);
    this.timer = setInterval(() => void this.drain(), interval);
    this.timer.unref();
    void this.drain();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.queue.close();
  }

  async drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      const events = await this.claimBatch();
      for (const event of events) await this.publish(event);
    } catch (error) {
      this.logger.error(
        'Outbox relay cycle failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.draining = false;
    }
  }

  private claimBatch() {
    const batchSize = Number(process.env.OUTBOX_BATCH_SIZE ?? 50);
    const leaseSeconds = Number(process.env.OUTBOX_LEASE_SECONDS ?? 60);

    return this.prisma.forAdmin(
      (tx) =>
        tx.$queryRaw<ClaimedEvent[]>`
        WITH candidates AS (
          SELECT id
          FROM outbox_events
          WHERE "publishedAt" IS NULL
            AND "deadLetteredAt" IS NULL
            AND "availableAt" <= NOW()
            AND ("lockedAt" IS NULL OR "lockedAt" < NOW() - (${leaseSeconds} * INTERVAL '1 second'))
          ORDER BY "createdAt"
          FOR UPDATE SKIP LOCKED
          LIMIT ${batchSize}
        )
        UPDATE outbox_events AS event
        SET "lockedAt" = NOW(), "lockedBy" = ${this.workerId}
        FROM candidates
        WHERE event.id = candidates.id
        RETURNING event.id, event."tenantId", event."eventKey", event.payload, event."attemptCount"
      `,
    );
  }

  private async publish(event: ClaimedEvent) {
    try {
      await this.queue.add(
        event.eventKey,
        {
          eventId: event.id,
          tenantId: event.tenantId,
          eventKey: event.eventKey,
          payload: event.payload,
        },
        {
          jobId: event.id,
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );

      await this.prisma.forAdmin((tx) =>
        tx.outboxEvent.updateMany({
          where: { id: event.id, lockedBy: this.workerId },
          data: {
            publishedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            lastError: null,
          },
        }),
      );
    } catch (error) {
      const nextAttempt = event.attemptCount + 1;
      const maxAttempts = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 10);
      const delaySeconds = Math.min(300, 2 ** Math.min(nextAttempt, 8));
      const message = error instanceof Error ? error.message : String(error);

      await this.prisma.forAdmin((tx) =>
        tx.outboxEvent.updateMany({
          where: { id: event.id, lockedBy: this.workerId },
          data: {
            attemptCount: nextAttempt,
            availableAt: new Date(Date.now() + delaySeconds * 1000),
            deadLetteredAt: nextAttempt >= maxAttempts ? new Date() : null,
            lastError: message.slice(0, 1000),
            lockedAt: null,
            lockedBy: null,
          },
        }),
      );
    }
  }
}

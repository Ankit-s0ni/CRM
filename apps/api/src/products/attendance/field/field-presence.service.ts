import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { Observable, Subject, filter, map } from 'rxjs';

export type FieldPresence = {
  employeeId: string;
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  speedMps: number | null;
  batteryLevel: number | null;
  capturedAt: string;
};

export type FieldStreamEvent = {
  id: string;
  tenantId: string;
  event: 'location';
  data: FieldPresence;
};

@Injectable()
export class FieldPresenceService implements OnModuleDestroy {
  private readonly logger = new Logger(FieldPresenceService.name);
  private readonly localEvents = new Subject<FieldStreamEvent>();
  private readonly redis = this.createRedis();

  async publish(tenantId: string, presence: FieldPresence) {
    const local: FieldStreamEvent = {
      id: `local-${Date.now()}`,
      tenantId,
      event: 'location',
      data: presence,
    };
    if (!this.redis) {
      this.localEvents.next(local);
      return local.id;
    }
    try {
      const ttl = Number(process.env.FIELD_PRESENCE_TTL_SECONDS ?? 180);
      const payload = JSON.stringify(presence);
      const streamId = await this.redis.xadd(
        streamKey(tenantId),
        'MAXLEN',
        '~',
        '2000',
        '*',
        'payload',
        payload,
      );
      await this.redis.set(
        presenceKey(tenantId, presence.employeeId),
        payload,
        'EX',
        ttl,
      );
      return streamId ?? local.id;
    } catch (error) {
      this.logger.warn(`Redis presence publish failed: ${errorMessage(error)}`);
      this.localEvents.next(local);
      return local.id;
    }
  }

  async getMany(tenantId: string, employeeIds: string[]) {
    if (!this.redis || employeeIds.length === 0)
      return new Map<string, FieldPresence>();
    try {
      const values = await this.redis.mget(
        employeeIds.map((employeeId) => presenceKey(tenantId, employeeId)),
      );
      const result = new Map<string, FieldPresence>();
      values.forEach((value, index) => {
        if (value)
          result.set(employeeIds[index], JSON.parse(value) as FieldPresence);
      });
      return result;
    } catch (error) {
      this.logger.warn(`Redis presence read failed: ${errorMessage(error)}`);
      return new Map<string, FieldPresence>();
    }
  }

  localStream(tenantId: string): Observable<FieldStreamEvent> {
    return this.localEvents.pipe(
      filter((event) => event.tenantId === tenantId),
      map((event) => event),
    );
  }

  redisStream(
    tenantId: string,
    lastEventId?: string,
  ): Observable<FieldStreamEvent> {
    return new Observable<FieldStreamEvent>((subscriber) => {
      const redis = this.createRedis();
      if (!redis) {
        subscriber.complete();
        return;
      }
      let active = true;
      let cursor = validCursor(lastEventId) ? lastEventId! : '$';
      const read = async () => {
        while (active) {
          try {
            const rows = await redis.xread(
              'COUNT',
              '100',
              'BLOCK',
              '15000',
              'STREAMS',
              streamKey(tenantId),
              cursor,
            );
            if (!rows) continue;
            for (const [, entries] of rows) {
              for (const [id, fields] of entries) {
                cursor = id;
                const payloadIndex = fields.indexOf('payload');
                if (payloadIndex < 0 || !fields[payloadIndex + 1]) continue;
                subscriber.next({
                  id,
                  tenantId,
                  event: 'location',
                  data: JSON.parse(fields[payloadIndex + 1]) as FieldPresence,
                });
              }
            }
          } catch (error) {
            if (active) {
              this.logger.warn(
                `Redis field stream failed: ${errorMessage(error)}`,
              );
              await delay(1_000);
            }
          }
        }
      };
      void read();
      return () => {
        active = false;
        redis.disconnect();
      };
    });
  }

  onModuleDestroy() {
    this.localEvents.complete();
    this.redis?.disconnect();
  }

  private createRedis() {
    if (
      process.env.FIELD_REDIS_MODE === 'disabled' ||
      process.env.NODE_ENV === 'test'
    ) {
      return undefined;
    }
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redis.on('error', () => undefined);
    return redis;
  }
}

function streamKey(tenantId: string) {
  return `field:stream:${tenantId}`;
}

function presenceKey(tenantId: string, employeeId: string) {
  return `field:presence:${tenantId}:${employeeId}`;
}

function validCursor(value?: string) {
  return !!value && /^\d+-\d+$/.test(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'unknown error';
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { HttpException, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class FieldRateLimitService implements OnModuleDestroy {
  private readonly redis = this.createRedis();
  private readonly local = new Map<
    string,
    { count: number; expiresAt: number }
  >();

  async assertAllowed(tenantId: string, deviceId: string, itemCount: number) {
    const window = Math.floor(Date.now() / 60_000);
    const deviceKey = `field:rate:device:${tenantId}:${deviceId}:${window}`;
    const tenantKey = `field:rate:tenant:${tenantId}:${window}`;
    const [deviceCount, tenantCount] = this.redis
      ? await this.incrementRedis(deviceKey, tenantKey, itemCount)
      : [
          this.incrementLocal(deviceKey, itemCount),
          this.incrementLocal(tenantKey, itemCount),
        ];
    const deviceLimit = Number(
      process.env.FIELD_DEVICE_PINGS_PER_MINUTE ?? 600,
    );
    const tenantLimit = Number(
      process.env.FIELD_TENANT_PINGS_PER_MINUTE ?? 10_000,
    );
    if (deviceCount > deviceLimit || tenantCount > tenantLimit) {
      throw new HttpException(
        {
          code: 'PING_RATE_LIMITED',
          message: 'Location upload rate limit exceeded',
          details: { retryAfterSeconds: secondsUntilNextMinute() },
        },
        429,
      );
    }
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  private async incrementRedis(
    deviceKey: string,
    tenantKey: string,
    count: number,
  ) {
    try {
      const result = await this.redis!.multi()
        .incrby(deviceKey, count)
        .expire(deviceKey, 120)
        .incrby(tenantKey, count)
        .expire(tenantKey, 120)
        .exec();
      return [Number(result?.[0]?.[1] ?? 0), Number(result?.[2]?.[1] ?? 0)];
    } catch {
      return [
        this.incrementLocal(deviceKey, count),
        this.incrementLocal(tenantKey, count),
      ];
    }
  }

  private incrementLocal(key: string, count: number) {
    const now = Date.now();
    const current = this.local.get(key);
    const next =
      !current || current.expiresAt <= now
        ? { count, expiresAt: now + 120_000 }
        : { ...current, count: current.count + count };
    this.local.set(key, next);
    if (this.local.size > 10_000) {
      for (const [storedKey, value] of this.local) {
        if (value.expiresAt <= now) this.local.delete(storedKey);
      }
    }
    return next.count;
  }

  private createRedis() {
    if (
      process.env.FIELD_REDIS_MODE === 'disabled' ||
      process.env.NODE_ENV === 'test'
    )
      return undefined;
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redis.on('error', () => undefined);
    return redis;
  }
}

function secondsUntilNextMinute() {
  return Math.max(1, 60 - new Date().getSeconds());
}

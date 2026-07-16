import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

type CacheLookup = {
  generation: string | null;
  value?: unknown;
};

@Injectable()
export class PolicyResolverCache implements OnModuleDestroy {
  private readonly redis =
    process.env.NODE_ENV === 'test'
      ? null
      : new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          enableOfflineQueue: false,
        });
  private readonly memoryGenerations = new Map<string, number>();
  private readonly memoryValues = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();

  async get(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<CacheLookup> {
    if (!this.redis) return this.getFromMemory(tenantId, employeeId, date);
    try {
      await this.connect();
      const generation =
        (await this.redis.get(this.versionKey(tenantId))) ?? '0';
      const value = await this.redis.get(
        this.valueKey(tenantId, generation, employeeId, date),
      );
      return {
        generation,
        value: value === null ? undefined : (JSON.parse(value) as unknown),
      };
    } catch {
      // Resolver correctness must not depend on cache availability.
      return { generation: null };
    }
  }

  async set(
    tenantId: string,
    employeeId: string,
    date: string,
    generation: string | null,
    value: unknown,
  ) {
    if (generation === null) return;
    if (!this.redis) {
      this.memoryValues.set(
        this.valueKey(tenantId, generation, employeeId, date),
        { expiresAt: Date.now() + 30_000, value },
      );
      return;
    }
    try {
      await this.connect();
      await this.redis.set(
        this.valueKey(tenantId, generation, employeeId, date),
        JSON.stringify(value),
        'EX',
        30,
      );
    } catch {
      // A cache write failure is safe because the database remains authoritative.
    }
  }

  async invalidate(tenantId: string) {
    if (!this.redis) {
      const generation = (this.memoryGenerations.get(tenantId) ?? 0) + 1;
      this.memoryGenerations.set(tenantId, generation);
      for (const key of this.memoryValues.keys()) {
        if (key.startsWith(`attendance:policy:${tenantId}:`))
          this.memoryValues.delete(key);
      }
      return;
    }
    try {
      await this.connect();
      await this.redis.incr(this.versionKey(tenantId));
    } catch {
      // When Redis is unavailable, reads bypass the cache until it recovers.
    }
  }

  onModuleDestroy() {
    if (this.redis && this.redis.status !== 'end') this.redis.disconnect();
  }

  private getFromMemory(
    tenantId: string,
    employeeId: string,
    date: string,
  ): CacheLookup {
    const generation = String(this.memoryGenerations.get(tenantId) ?? 0);
    const key = this.valueKey(tenantId, generation, employeeId, date);
    const cached = this.memoryValues.get(key);
    if (!cached || cached.expiresAt <= Date.now()) {
      this.memoryValues.delete(key);
      return { generation };
    }
    return { generation, value: cached.value };
  }

  private async connect() {
    if (this.redis?.status === 'wait') await this.redis.connect();
  }

  private versionKey(tenantId: string) {
    return `attendance:policy-version:${tenantId}`;
  }

  private valueKey(
    tenantId: string,
    generation: string,
    employeeId: string,
    date: string,
  ) {
    return `attendance:policy:${tenantId}:${generation}:${employeeId}:${date}`;
  }
}

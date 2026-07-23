import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import Redis from 'ioredis';
import { PrismaService } from '../database/prisma.service';

type DependencyStatus = { status: 'up' | 'down'; latencyMs: number };

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis = new Redis(
    process.env.REDIS_URL ?? 'redis://localhost:6379',
    {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    },
  );
  private readonly storage = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION ?? 'eu-north-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    },
  });

  constructor(private readonly prisma: PrismaService) {}

  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async readiness() {
    const dependencies = await this.dependencies();
    const ready = Object.values(dependencies).every(
      (result) => result.status === 'up',
    );

    if (!ready) {
      throw new ServiceUnavailableException({
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'One or more required dependencies are unavailable',
        details: { dependencies },
      });
    }

    return { status: 'ready', dependencies };
  }

  async dependencies() {
    const checks = await Promise.all([
      this.check('database', () =>
        this.prisma.forAdmin((tx) => tx.$queryRaw`SELECT 1`),
      ),
      this.check('redis', async () => {
        if (this.redis.status === 'wait') await this.redis.connect();
        await this.redis.ping();
      }),
      this.check('objectStorage', () =>
        this.storage.send(new ListBucketsCommand({})),
      ),
    ]);
    return Object.fromEntries(checks) as Record<string, DependencyStatus>;
  }

  onModuleDestroy() {
    if (this.redis.status !== 'end') this.redis.disconnect();
    this.storage.destroy();
  }

  private async check(
    name: string,
    operation: () => Promise<unknown>,
  ): Promise<[string, DependencyStatus]> {
    const startedAt = Date.now();
    try {
      await operation();
      return [name, { status: 'up', latencyMs: Date.now() - startedAt }];
    } catch {
      return [name, { status: 'down', latencyMs: Date.now() - startedAt }];
    }
  }
}

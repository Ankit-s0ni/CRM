import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { PrivateEvidenceStorageService } from './private-evidence-storage.service';

export type PrivateEvidenceDeletionTask = {
  eventId: string;
  tenantId: string | null;
  payload: {
    employeeId?: unknown;
    objectKeys?: unknown;
  };
};

@Injectable()
export class PrivateEvidenceDeletionWorker
  implements OnModuleInit, OnModuleDestroy
{
  private worker?: Worker<PrivateEvidenceDeletionTask>;

  constructor(private readonly storage: PrivateEvidenceStorageService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.worker = new Worker(
      'private-evidence-deletion',
      (job) => this.process(job),
      { connection: redisConnection(), concurrency: 4 },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  async process(job: Pick<Job<PrivateEvidenceDeletionTask>, 'data'>) {
    const { tenantId, payload } = job.data;
    if (
      !tenantId ||
      typeof payload.employeeId !== 'string' ||
      !Array.isArray(payload.objectKeys) ||
      !payload.objectKeys.every((key) => typeof key === 'string')
    ) {
      throw new Error('EVIDENCE_DELETION_PAYLOAD_INVALID');
    }
    await Promise.all(
      payload.objectKeys.map((objectKey) =>
        this.storage.deleteEnrollmentObject(
          tenantId,
          payload.employeeId as string,
          objectKey,
        ),
      ),
    );
    return { deleted: payload.objectKeys.length };
  }
}

function redisConnection() {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
  };
}

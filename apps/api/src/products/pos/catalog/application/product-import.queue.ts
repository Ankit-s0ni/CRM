import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  ProductImportJobData,
  ProductImportProcessor,
} from './product-import.processor';

export const POS_PRODUCT_IMPORT_QUEUE = 'pos-product-import';

@Injectable()
export class ProductImportQueue implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue<ProductImportJobData>;

  constructor(private readonly processor: ProductImportProcessor) {}

  onModuleInit() {
    if (this.inlineMode()) return;
    this.queue = new Queue<ProductImportJobData>(POS_PRODUCT_IMPORT_QUEUE, {
      connection: this.connection(),
    });
  }

  async enqueue(data: ProductImportJobData) {
    // Inline mode keeps e2e specs and local runs honest without a Redis or a worker
    // process, mirroring IMPORT_QUEUE_MODE in the employee import.
    if (this.inlineMode()) {
      await this.processor.process(data);
      return;
    }
    await this.queue?.add('import', data, {
      // Deterministic id: re-enqueueing the same job is a no-op rather than a second run.
      jobId: `${data.tenantId}-${data.importJobId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  connection() {
    const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    };
  }

  private inlineMode() {
    if (process.env.POS_IMPORT_QUEUE_MODE) {
      return process.env.POS_IMPORT_QUEUE_MODE === 'inline';
    }
    return process.env.NODE_ENV === 'test';
  }
}

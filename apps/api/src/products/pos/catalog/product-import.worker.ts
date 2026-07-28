import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import {
  ProductImportJobData,
  ProductImportProcessor,
} from './application/product-import.processor';
import {
  POS_PRODUCT_IMPORT_QUEUE,
  ProductImportQueue,
} from './application/product-import.queue';

/**
 * Registered as a provider of `src/worker.module.ts` ONLY — never of PosCatalogModule.
 * A worker provided by the capability module would also be instantiated by AppModule and
 * would start consuming the queue inside the API process. See src/products/pos/README.md.
 */
@Injectable()
export class ProductImportWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<ProductImportJobData>;

  constructor(
    private readonly queue: ProductImportQueue,
    private readonly processor: ProductImportProcessor,
  ) {}

  onModuleInit() {
    if (
      process.env.POS_IMPORT_QUEUE_MODE === 'inline' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }
    this.worker = new Worker<ProductImportJobData>(
      POS_PRODUCT_IMPORT_QUEUE,
      (job: Job<ProductImportJobData>) => this.processor.process(job.data),
      {
        connection: this.queue.connection(),
        concurrency: Number(process.env.POS_IMPORT_WORKER_CONCURRENCY ?? 2),
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}

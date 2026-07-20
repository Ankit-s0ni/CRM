import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TenantDeletionService } from './tenant-deletion.service';

@Injectable()
export class TenantDeletionWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(private readonly deletion: TenantDeletionService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), 30_000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (await this.deletion.processNext()) {
        // Drain due jobs serially to keep destructive work predictable.
      }
    } finally {
      this.processing = false;
    }
  }
}

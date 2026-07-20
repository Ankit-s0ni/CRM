import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DunningService } from './dunning.service';

@Injectable()
export class DunningWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly dunning: DunningService) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.BILLING_WORKER_MODE === 'disabled'
    ) {
      return;
    }
    const interval = Math.max(
      30_000,
      Number(process.env.DUNNING_POLL_INTERVAL_MS ?? 300_000),
    );
    this.timer = setInterval(() => void this.tick(), interval);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.dunning.runDue();
    } finally {
      this.running = false;
    }
  }
}

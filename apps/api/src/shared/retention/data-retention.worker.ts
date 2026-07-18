import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DataRetentionService } from './data-retention.service';

@Injectable()
export class DataRetentionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DataRetentionWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly retention: DataRetentionService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(
      () => void this.tick(),
      Number(process.env.RETENTION_INTERVAL_MS ?? 3_600_000),
    );
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
      const result = await this.retention.run();
      if (
        result.notifications ||
        result.deliveries ||
        result.verificationTokens
      ) {
        this.logger.log({ event: 'retention.completed', ...result });
      }
    } catch (error) {
      this.logger.error(
        'Retention cycle failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}

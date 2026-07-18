import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DeviceIntegrityChallengeService } from './device-integrity-challenge.service';

@Injectable()
export class DeviceIntegrityChallengeWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DeviceIntegrityChallengeWorker.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly challenges: DeviceIntegrityChallengeService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    const interval = Math.max(
      60_000,
      Number(process.env.INTEGRITY_CHALLENGE_CLEANUP_INTERVAL_MS ?? 3_600_000),
    );
    this.timer = setInterval(() => void this.run(), interval);
    this.timer.unref();
    void this.run();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    try {
      const result = await this.challenges.cleanupExpired();
      if (result.count > 0) {
        this.logger.log(`Deleted ${result.count} expired integrity challenges`);
      }
    } catch (error) {
      this.logger.error(
        'Integrity challenge cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

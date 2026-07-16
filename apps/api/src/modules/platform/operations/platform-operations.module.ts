import { Module } from '@nestjs/common';
import { HealthModule } from '../../../shared/health/health.module';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { PlatformOperationsController } from './platform-operations.controller';
import { PlatformOperationsService } from './platform-operations.service';

@Module({
  imports: [PlatformAuthModule, HealthModule],
  controllers: [PlatformOperationsController],
  providers: [PlatformOperationsService],
})
export class PlatformOperationsModule {}

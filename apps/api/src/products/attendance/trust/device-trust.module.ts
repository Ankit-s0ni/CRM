import { Module } from '@nestjs/common';
import { DeviceTrustController } from './device-trust.controller';
import { DeviceTrustService } from './device-trust.service';

@Module({
  controllers: [DeviceTrustController],
  providers: [DeviceTrustService],
  exports: [DeviceTrustService],
})
export class DeviceTrustModule {}

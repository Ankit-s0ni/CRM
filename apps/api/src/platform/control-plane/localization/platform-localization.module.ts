import { Module } from '@nestjs/common';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { PlatformLocalizationController } from './platform-localization.controller';
import { PlatformLocalizationService } from './platform-localization.service';

@Module({
  imports: [PlatformAuthModule],
  controllers: [PlatformLocalizationController],
  providers: [PlatformLocalizationService],
  exports: [PlatformLocalizationService],
})
export class PlatformLocalizationModule {}

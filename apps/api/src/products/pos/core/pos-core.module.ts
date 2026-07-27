import { Module } from '@nestjs/common';
import { PosSettingsService } from './application/pos-settings.service';
import { PosSettingsController } from './presentation/pos-settings.controller';

@Module({
  controllers: [PosSettingsController],
  providers: [PosSettingsService],
  exports: [PosSettingsService],
})
export class PosCoreModule {}

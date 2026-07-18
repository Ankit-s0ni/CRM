import { Module } from '@nestjs/common';
import { WorkspaceSettingsModule } from '../workspace-settings/workspace-settings.module';
import {
  AttendanceCapabilitiesController,
  MobileRuntimeConfigController,
} from './runtime-config.controller';
import { RuntimeConfigService } from './runtime-config.service';

@Module({
  imports: [WorkspaceSettingsModule],
  controllers: [
    MobileRuntimeConfigController,
    AttendanceCapabilitiesController,
  ],
  providers: [RuntimeConfigService],
  exports: [RuntimeConfigService],
})
export class RuntimeConfigModule {}

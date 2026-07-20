import { Module } from '@nestjs/common';
import { WorkspaceSettingsModule } from '../../../platform/workspace/public';
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

import { Module } from '@nestjs/common';
import { WorkspaceSettingsModule } from '../workspace-settings/workspace-settings.module';
import { WorkspaceModule } from './workspace.module';
import { LocalizationModule } from '../localization/localization.module';

@Module({
  imports: [WorkspaceModule, WorkspaceSettingsModule, LocalizationModule],
  exports: [WorkspaceModule, WorkspaceSettingsModule, LocalizationModule],
})
export class WorkspaceProductModule {}

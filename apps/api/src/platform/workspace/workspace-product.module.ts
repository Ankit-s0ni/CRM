import { Module } from '@nestjs/common';
import { WorkspaceSettingsModule } from '../workspace-settings/workspace-settings.module';
import { WorkspaceModule } from './workspace.module';

@Module({
  imports: [WorkspaceModule, WorkspaceSettingsModule],
  exports: [WorkspaceModule, WorkspaceSettingsModule],
})
export class WorkspaceProductModule {}

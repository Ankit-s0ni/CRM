import { Module } from '@nestjs/common';
import { TenantAssetStorageService } from './tenant-asset-storage.service';
import { WorkspaceSettingsController } from './workspace-settings.controller';
import { WorkspaceSettingsService } from './workspace-settings.service';

@Module({
  controllers: [WorkspaceSettingsController],
  providers: [WorkspaceSettingsService, TenantAssetStorageService],
})
export class WorkspaceSettingsModule {}

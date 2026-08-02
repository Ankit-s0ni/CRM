import { Module } from '@nestjs/common';
import { TenantAssetStorageService } from './tenant-asset-storage.service';
import { WorkspaceSettingsController } from './workspace-settings.controller';
import { WorkspaceSettingsService } from './workspace-settings.service';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';

@Module({
  controllers: [WorkspaceSettingsController],
  providers: [
    WorkspaceSettingsService,
    WorkspaceOnboardingService,
    TenantAssetStorageService,
  ],
  exports: [WorkspaceSettingsService, TenantAssetStorageService],
})
export class WorkspaceSettingsModule {}

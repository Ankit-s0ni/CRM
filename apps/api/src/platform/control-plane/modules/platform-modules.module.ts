import { Module } from '@nestjs/common';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import {
  PlatformModulesController,
  PlatformCatalogController,
  PlatformTenantEntitlementsController,
  PlatformTenantModulesController,
} from './platform-modules.controller';
import { PlatformModulesService } from './platform-modules.service';

@Module({
  imports: [PlatformAuthModule],
  controllers: [
    PlatformModulesController,
    PlatformCatalogController,
    PlatformTenantModulesController,
    PlatformTenantEntitlementsController,
  ],
  providers: [PlatformModulesService],
  exports: [PlatformModulesService],
})
export class PlatformModulesModule {}

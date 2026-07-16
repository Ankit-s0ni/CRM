import { Module } from '@nestjs/common';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import {
  PlatformModulesController,
  PlatformTenantModulesController,
} from './platform-modules.controller';
import { PlatformModulesService } from './platform-modules.service';

@Module({
  imports: [PlatformAuthModule],
  controllers: [PlatformModulesController, PlatformTenantModulesController],
  providers: [PlatformModulesService],
  exports: [PlatformModulesService],
})
export class PlatformModulesModule {}

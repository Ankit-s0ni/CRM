import { Module } from '@nestjs/common';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import {
  PlatformPlansController,
  PlatformTenantsController,
} from './platform-tenants.controller';
import { PlatformTenantsService } from './platform-tenants.service';

@Module({
  imports: [PlatformAuthModule],
  controllers: [PlatformTenantsController, PlatformPlansController],
  providers: [PlatformTenantsService],
  exports: [PlatformTenantsService],
})
export class PlatformTenantsModule {}

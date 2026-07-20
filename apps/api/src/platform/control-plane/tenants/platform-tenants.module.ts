import { Module } from '@nestjs/common';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { BiometricsModule } from '../../../products/attendance/biometrics/biometrics.module';
import { PlatformTenantsController } from './platform-tenants.controller';
import { PlatformTenantsService } from './platform-tenants.service';
import { TenantDeletionService } from './tenant-deletion.service';

@Module({
  imports: [PlatformAuthModule, BiometricsModule],
  controllers: [PlatformTenantsController],
  providers: [PlatformTenantsService, TenantDeletionService],
  exports: [PlatformTenantsService, TenantDeletionService],
})
export class PlatformTenantsModule {}

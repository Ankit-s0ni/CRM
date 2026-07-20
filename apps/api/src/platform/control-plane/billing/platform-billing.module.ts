import { Module } from '@nestjs/common';
import { BillingModule } from '../../billing/public';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { PlatformTenantsModule } from '../tenants/platform-tenants.module';
import { PlatformBillingController } from './platform-billing.controller';
import { PlatformBillingService } from './platform-billing.service';

@Module({
  imports: [BillingModule, PlatformAuthModule, PlatformTenantsModule],
  controllers: [PlatformBillingController],
  providers: [PlatformBillingService],
  exports: [PlatformBillingService],
})
export class PlatformBillingModule {}

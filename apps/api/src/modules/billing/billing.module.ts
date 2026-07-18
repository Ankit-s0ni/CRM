import { Module } from '@nestjs/common';
import { PrivateObjectStorageModule } from '../../shared/storage/private-object-storage.module';
import { PlatformAuthModule } from '../platform/platform-auth/platform-auth.module';
import { PlatformTenantsModule } from '../platform/tenants/platform-tenants.module';
import { BillingWebhookService } from './application/billing-webhook.service';
import { BillingService } from './application/billing.service';
import { DunningService } from './application/dunning.service';
import {
  PaymentProviderRegistry,
  RazorpayProvider,
  StripeProvider,
} from './infrastructure/payment-providers';
import { BillingWebhookController } from './presentation/billing-webhook.controller';
import { BillingController } from './presentation/billing.controller';

@Module({
  imports: [
    PrivateObjectStorageModule,
    PlatformAuthModule,
    PlatformTenantsModule,
  ],
  controllers: [BillingController, BillingWebhookController],
  providers: [
    BillingService,
    BillingWebhookService,
    DunningService,
    RazorpayProvider,
    StripeProvider,
    PaymentProviderRegistry,
  ],
  exports: [BillingService, DunningService, PaymentProviderRegistry],
})
export class BillingModule {}

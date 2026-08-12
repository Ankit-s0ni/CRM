import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/public';
import { InternalProductServiceGuard } from './internal-product-service.guard';
import { ProductIntegrationController } from './product-integration.controller';
import { ProductRegistryController } from './product-registry.controller';
import { ProductPlatformAdapterModule } from './product-platform-adapter.module';
import { PlatformAuthModule } from '../control-plane/public';
import { ProductCommercialController } from './product-commercial.controller';
import { ProductRegistrationCiController } from './product-registration-ci.controller';
import { ProductRegistrationCiGuard } from './product-registration-ci.guard';

@Global()
@Module({
  imports: [IdentityModule, PlatformAuthModule, ProductPlatformAdapterModule],
  controllers: [
    ProductIntegrationController,
    ProductRegistryController,
    ProductCommercialController,
    ProductRegistrationCiController,
  ],
  providers: [InternalProductServiceGuard, ProductRegistrationCiGuard],
  exports: [ProductPlatformAdapterModule],
})
export class ProductIntegrationModule {}

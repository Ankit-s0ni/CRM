import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  PRODUCT_PLATFORM_PORT,
  PRODUCT_TOKEN_VERIFICATION_KEY,
} from '@deltcrm/product-contracts';
import { ProductIntegrationService } from './product-integration.service';
import { ProductSigningKeyService } from './product-signing-key.service';

// Temporary in-process adapter used until HRMS calls the Platform contract over
// the internal service boundary. It deliberately exposes no HTTP controllers.
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    ProductSigningKeyService,
    ProductIntegrationService,
    {
      provide: PRODUCT_PLATFORM_PORT,
      useExisting: ProductIntegrationService,
    },
    {
      provide: PRODUCT_TOKEN_VERIFICATION_KEY,
      inject: [ProductSigningKeyService],
      useFactory: (keys: ProductSigningKeyService) => ({
        issuer: keys.issuer,
        publicKey: keys.publicKey,
      }),
    },
  ],
  exports: [
    ProductIntegrationService,
    PRODUCT_PLATFORM_PORT,
    PRODUCT_TOKEN_VERIFICATION_KEY,
  ],
})
export class ProductPlatformAdapterModule {}

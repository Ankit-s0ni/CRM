import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  PRODUCT_PLATFORM_PORT,
  PRODUCT_TOKEN_VERIFICATION_KEY,
} from '@mariya-abdul/deltcrm-product-contracts';
import { ProductIntegrationService } from './product-integration.service';
import { ProductEntitlementService } from './product-entitlement.service';
import { ProductRegistryService } from './product-registry.service';
import { ProductSigningKeyService } from './product-signing-key.service';
import { ProductOperationsService } from './product-operations.service';
import { ProductHealthService } from './product-health.service';
import { ProductCommercialService } from './product-commercial.service';
import { PRODUCT_READINESS_PORT } from '../../shared/products/product-readiness.port';
import { ProductReadinessAdapter } from './product-readiness.adapter';

// Generic in-process Platform protocol adapter. Product services consume the
// same contract over the authenticated HTTP boundary.
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    ProductSigningKeyService,
    ProductRegistryService,
    ProductEntitlementService,
    ProductIntegrationService,
    ProductOperationsService,
    ProductHealthService,
    ProductCommercialService,
    ProductReadinessAdapter,
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
    {
      provide: PRODUCT_READINESS_PORT,
      useExisting: ProductReadinessAdapter,
    },
  ],
  exports: [
    ProductIntegrationService,
    ProductRegistryService,
    ProductEntitlementService,
    ProductOperationsService,
    ProductHealthService,
    ProductCommercialService,
    PRODUCT_PLATFORM_PORT,
    PRODUCT_READINESS_PORT,
    PRODUCT_TOKEN_VERIFICATION_KEY,
  ],
})
export class ProductPlatformAdapterModule {}

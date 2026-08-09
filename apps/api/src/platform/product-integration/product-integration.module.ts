import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/public';
import { InternalProductServiceGuard } from './internal-product-service.guard';
import { ProductIntegrationController } from './product-integration.controller';
import { ProductPlatformAdapterModule } from './product-platform-adapter.module';

@Global()
@Module({
  imports: [IdentityModule, ProductPlatformAdapterModule],
  controllers: [ProductIntegrationController],
  providers: [InternalProductServiceGuard],
  exports: [ProductPlatformAdapterModule],
})
export class ProductIntegrationModule {}

import { Module } from '@nestjs/common';
import { ProductCategoryModule } from './category/product-category.module';
import { ProductInventoryModule } from './inventory/product-inventory.module';
import { CheckoutModule } from './checkout/checkout.module';

const POS_CAPABILITY_MODULES = [
  ProductCategoryModule,
  ProductInventoryModule,
  CheckoutModule,
];

@Module({
  imports: POS_CAPABILITY_MODULES,
  exports: POS_CAPABILITY_MODULES,
})
export class PosProductModule {}

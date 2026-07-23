import { Module } from '@nestjs/common';
import { ProductCategoryModule } from './category/product-category.module';

const POS_CAPABILITY_MODULES = [
  ProductCategoryModule,
];

@Module({
  imports: POS_CAPABILITY_MODULES,
  exports: POS_CAPABILITY_MODULES,
})
export class PosProductModule {}

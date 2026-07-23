import { Module } from '@nestjs/common';
import { ProductInventoryController } from './product-inventory.controller';
import { ProductInventoryService } from './product-inventory.service';

@Module({
  controllers: [ProductInventoryController],
  providers: [ProductInventoryService],
  exports: [ProductInventoryService],
})
export class ProductInventoryModule {}

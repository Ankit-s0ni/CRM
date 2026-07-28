import { Module } from '@nestjs/common';
import { PosCoreModule } from '../core/pos-core.module';
import { PosCategoryService } from './application/pos-category.service';
import { PosProductService } from './application/pos-product.service';
import { PosUnitService } from './application/pos-unit.service';
import { ProductExportService } from './application/product-export.service';
import { ProductImportProcessor } from './application/product-import.processor';
import { ProductImportQueue } from './application/product-import.queue';
import { ProductImportService } from './application/product-import.service';
import { PosCatalogStorageService } from './infrastructure/pos-catalog-storage.service';
import { PosCategoryController } from './presentation/pos-category.controller';
import { PosProductController } from './presentation/pos-product.controller';
import { PosUnitController } from './presentation/pos-unit.controller';
import { ProductImportController } from './presentation/product-import.controller';

// Note: ProductImportWorker is deliberately NOT a provider here. It belongs to
// worker.module.ts only, so it never starts consuming inside the API process.
@Module({
  imports: [PosCoreModule],
  controllers: [
    PosCategoryController,
    PosUnitController,
    PosProductController,
    ProductImportController,
  ],
  providers: [
    PosCategoryService,
    PosUnitService,
    PosProductService,
    PosCatalogStorageService,
    ProductImportService,
    ProductImportProcessor,
    ProductImportQueue,
    ProductExportService,
  ],
  exports: [
    PosCategoryService,
    PosUnitService,
    PosProductService,
    ProductImportProcessor,
    ProductImportQueue,
  ],
})
export class PosCatalogModule {}

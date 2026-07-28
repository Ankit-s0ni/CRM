import { Module } from '@nestjs/common';
import { PosCatalogModule } from './catalog/pos-catalog.module';
import { PosCoreModule } from './core/pos-core.module';

// The application root imports POS as one product while these internal capabilities
// remain independently testable and replaceable.
const POS_CAPABILITY_MODULES = [PosCoreModule, PosCatalogModule];

@Module({
  imports: POS_CAPABILITY_MODULES,
  exports: POS_CAPABILITY_MODULES,
})
export class PosProductModule {}

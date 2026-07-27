import { Module } from '@nestjs/common';
import { PosCoreModule } from './core/pos-core.module';

// The application root imports POS as one product while these internal capabilities
// remain independently testable and replaceable.
const POS_CAPABILITY_MODULES = [PosCoreModule];

@Module({
  imports: POS_CAPABILITY_MODULES,
  exports: POS_CAPABILITY_MODULES,
})
export class PosProductModule {}

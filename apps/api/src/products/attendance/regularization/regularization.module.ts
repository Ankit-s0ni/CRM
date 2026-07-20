import { Module } from '@nestjs/common';
import { PrivateObjectStorageModule } from '../../../shared/storage/private-object-storage.module';
import { AttendanceModule } from '../core/attendance.module';
import { RegularizationController } from './regularization.controller';
import { RegularizationService } from './regularization.service';

@Module({
  imports: [PrivateObjectStorageModule, AttendanceModule],
  controllers: [RegularizationController],
  providers: [RegularizationService],
  exports: [RegularizationService],
})
export class RegularizationModule {}

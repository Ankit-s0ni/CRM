import { Module } from '@nestjs/common';
import { PrivateObjectStorageModule } from '../../../shared/storage/private-object-storage.module';
import { ReportingController } from './reporting.controller';
import { ReportingProcessor } from './reporting.processor';
import { ReportingQueue } from './reporting.queue';
import { ReportingService } from './reporting.service';

@Module({
  imports: [PrivateObjectStorageModule],
  controllers: [ReportingController],
  providers: [ReportingService, ReportingProcessor, ReportingQueue],
  exports: [ReportingService, ReportingProcessor, ReportingQueue],
})
export class ReportingModule {}

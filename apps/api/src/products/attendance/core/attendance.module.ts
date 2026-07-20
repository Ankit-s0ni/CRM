import { Module } from '@nestjs/common';
import { AttendanceContextService } from './application/attendance-context.service';
import { AttendanceRuntimeService } from './application/attendance-runtime.service';
import { AttendanceRuntimeController } from './presentation/attendance-runtime.controller';
import { AttendanceQueryController } from './presentation/attendance-query.controller';
import { AttendanceQueryService } from './application/attendance-query.service';
import { AttendanceExceptionsService } from './application/attendance-exceptions.service';
import { AttendanceJobProcessor } from './jobs/attendance-job.processor';
import { AttendanceJobQueue } from './jobs/attendance-job.queue';
import { AttendanceJobScheduler } from './jobs/attendance-job.scheduler';

@Module({
  controllers: [AttendanceRuntimeController, AttendanceQueryController],
  providers: [
    AttendanceContextService,
    AttendanceRuntimeService,
    AttendanceQueryService,
    AttendanceExceptionsService,
    AttendanceJobProcessor,
    AttendanceJobQueue,
    AttendanceJobScheduler,
  ],
  exports: [
    AttendanceContextService,
    AttendanceRuntimeService,
    AttendanceJobProcessor,
    AttendanceJobQueue,
    AttendanceJobScheduler,
  ],
})
export class AttendanceModule {}

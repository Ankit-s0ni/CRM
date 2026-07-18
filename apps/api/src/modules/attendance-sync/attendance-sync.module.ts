import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { AttendanceVerificationModule } from '../attendance-verification/attendance-verification.module';
import { AttendanceSyncController } from './attendance-sync.controller';
import { AttendanceSyncService } from './attendance-sync.service';

@Module({
  imports: [AttendanceModule, AttendanceVerificationModule],
  controllers: [AttendanceSyncController],
  providers: [AttendanceSyncService],
  exports: [AttendanceSyncService],
})
export class AttendanceSyncModule {}

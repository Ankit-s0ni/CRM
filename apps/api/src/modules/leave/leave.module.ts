import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeaveController } from './leave.controller';
import { LeaveApprovedProcessor } from './leave-approved.processor';
import { LeaveEventQueue } from './leave-event.queue';
import { LeaveService } from './leave.service';

@Module({
  imports: [AttendanceModule],
  controllers: [LeaveController],
  providers: [LeaveService, LeaveApprovedProcessor, LeaveEventQueue],
  exports: [LeaveService, LeaveApprovedProcessor, LeaveEventQueue],
})
export class LeaveModule {}

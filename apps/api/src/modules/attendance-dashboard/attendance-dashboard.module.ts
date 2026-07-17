import { Module } from '@nestjs/common';
import { AttendanceDashboardController } from './attendance-dashboard.controller';
import { AttendanceDashboardService } from './attendance-dashboard.service';

@Module({
  controllers: [AttendanceDashboardController],
  providers: [AttendanceDashboardService],
})
export class AttendanceDashboardModule {}

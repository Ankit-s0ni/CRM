import { Module } from '@nestjs/common';
import {
  AttendanceDashboardController,
  HrDashboardController,
} from './attendance-dashboard.controller';
import { AttendanceDashboardService } from './attendance-dashboard.service';

@Module({
  controllers: [AttendanceDashboardController, HrDashboardController],
  providers: [AttendanceDashboardService],
})
export class AttendanceDashboardModule {}

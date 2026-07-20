import { Module } from '@nestjs/common';
import { AttendanceModule } from '../core/attendance.module';
import { FieldPingService } from './field-ping.service';
import { FieldSessionService } from './field-session.service';
import { FieldTrackingController } from './field-tracking.controller';
import { FieldPresenceService } from './field-presence.service';
import { FieldPingProcessor } from './jobs/field-ping.processor';
import { FieldPingQueue } from './jobs/field-ping.queue';
import { FieldRouteService } from './route/field-route.service';
import { FieldRateLimitService } from './field-rate-limit.service';
import { FieldMaintenanceService } from './jobs/field-maintenance.service';
import { FieldMaintenanceQueue } from './jobs/field-maintenance.queue';
import { RuntimeConfigModule } from '../runtime-config/runtime-config.module';

@Module({
  imports: [AttendanceModule, RuntimeConfigModule],
  controllers: [FieldTrackingController],
  providers: [
    FieldSessionService,
    FieldPingService,
    FieldPresenceService,
    FieldPingProcessor,
    FieldPingQueue,
    FieldRouteService,
    FieldRateLimitService,
    FieldMaintenanceService,
    FieldMaintenanceQueue,
  ],
  exports: [
    FieldSessionService,
    FieldPingService,
    FieldPresenceService,
    FieldPingProcessor,
    FieldPingQueue,
    FieldRouteService,
    FieldMaintenanceService,
    FieldMaintenanceQueue,
  ],
})
export class FieldTrackingModule {}

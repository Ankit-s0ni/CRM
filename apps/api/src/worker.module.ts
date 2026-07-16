import { Module } from '@nestjs/common';
import { AppModule } from './app.module';
import { EmployeeImportWorker } from './modules/organization/imports/employee-import.worker';
import { OrganizationModule } from './modules/organization/organization.module';
import { OutboxRelayService } from './shared/events/outbox-relay.service';
import { AttendanceConfigModule } from './modules/attendance-config/attendance-config.module';
import { RosterImportWorker } from './modules/attendance-config/imports/roster-import.worker';

@Module({
  imports: [AppModule, OrganizationModule, AttendanceConfigModule],
  providers: [EmployeeImportWorker, RosterImportWorker, OutboxRelayService],
})
export class WorkerModule {}

import { Module } from '@nestjs/common';
import { AppModule } from './app.module';
import { EmployeeImportWorker } from './modules/organization/imports/employee-import.worker';
import { OrganizationModule } from './modules/organization/organization.module';
import { OutboxRelayService } from './shared/events/outbox-relay.service';

@Module({
  imports: [AppModule, OrganizationModule],
  providers: [EmployeeImportWorker, OutboxRelayService],
})
export class WorkerModule {}

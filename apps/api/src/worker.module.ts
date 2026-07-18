import { Module } from '@nestjs/common';
import { AppModule } from './app.module';
import { EmployeeImportWorker } from './modules/organization/imports/employee-import.worker';
import { OrganizationModule } from './modules/organization/organization.module';
import { OutboxRelayService } from './shared/events/outbox-relay.service';
import { AttendanceConfigModule } from './modules/attendance-config/attendance-config.module';
import { RosterImportWorker } from './modules/attendance-config/imports/roster-import.worker';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AttendanceJobWorker } from './modules/attendance/jobs/attendance-job.worker';
import { FieldTrackingModule } from './modules/field-tracking/field-tracking.module';
import { FieldPingWorker } from './modules/field-tracking/jobs/field-ping.worker';
import { FieldMaintenanceWorker } from './modules/field-tracking/jobs/field-maintenance.worker';
import { AttendanceVerificationModule } from './modules/attendance-verification/attendance-verification.module';
import { DeviceIntegrityChallengeWorker } from './modules/attendance-verification/device-integrity-challenge.worker';
import { BiometricsModule } from './modules/biometrics/biometrics.module';
import { PrivateEvidenceDeletionWorker } from './modules/biometrics/private-evidence-deletion.worker';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NotificationEventWorker } from './modules/notifications/notification-event.worker';
import { ReportingModule } from './modules/reporting/reporting.module';
import { ReportingWorker } from './modules/reporting/reporting.worker';
import { LeaveModule } from './modules/leave/leave.module';
import { LeaveEventWorker } from './modules/leave/leave-event.worker';
import { BillingModule } from './modules/billing/billing.module';
import { DunningWorker } from './modules/billing/application/dunning.worker';
import { PlatformTenantsModule } from './modules/platform/tenants/platform-tenants.module';
import { TenantDeletionWorker } from './modules/platform/tenants/tenant-deletion.worker';
import { RetentionModule } from './shared/retention/retention.module';
import { DataRetentionWorker } from './shared/retention/data-retention.worker';

@Module({
  imports: [
    AppModule,
    OrganizationModule,
    AttendanceConfigModule,
    AttendanceModule,
    FieldTrackingModule,
    AttendanceVerificationModule,
    BiometricsModule,
    NotificationsModule,
    ReportingModule,
    LeaveModule,
    BillingModule,
    PlatformTenantsModule,
    RetentionModule,
  ],
  providers: [
    EmployeeImportWorker,
    RosterImportWorker,
    AttendanceJobWorker,
    OutboxRelayService,
    FieldPingWorker,
    FieldMaintenanceWorker,
    DeviceIntegrityChallengeWorker,
    PrivateEvidenceDeletionWorker,
    NotificationEventWorker,
    ReportingWorker,
    LeaveEventWorker,
    DunningWorker,
    TenantDeletionWorker,
    DataRetentionWorker,
  ],
})
export class WorkerModule {}

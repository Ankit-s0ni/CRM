import { Module } from '@nestjs/common';
import { AppModule } from './app.module';
import { EmployeeImportWorker } from './platform/organization/imports/employee-import.worker';
import { OrganizationModule } from './platform/organization/organization.module';
import { OutboxRelayService } from './shared/events/outbox-relay.service';
import { AttendanceConfigModule } from './products/attendance/configuration/attendance-config.module';
import { RosterImportWorker } from './products/attendance/configuration/imports/roster-import.worker';
import { AttendanceModule } from './products/attendance/core/attendance.module';
import { AttendanceJobWorker } from './products/attendance/core/jobs/attendance-job.worker';
import { FieldTrackingModule } from './products/attendance/field/field-tracking.module';
import { FieldPingWorker } from './products/attendance/field/jobs/field-ping.worker';
import { FieldMaintenanceWorker } from './products/attendance/field/jobs/field-maintenance.worker';
import { AttendanceVerificationModule } from './products/attendance/verification/attendance-verification.module';
import { DeviceIntegrityChallengeWorker } from './products/attendance/verification/device-integrity-challenge.worker';
import { BiometricsModule } from './products/attendance/biometrics/biometrics.module';
import { PrivateEvidenceDeletionWorker } from './products/attendance/biometrics/private-evidence-deletion.worker';
import { NotificationsModule } from './platform/notifications/notifications.module';
import { NotificationEventWorker } from './platform/notifications/notification-event.worker';
import { ReportingModule } from './products/attendance/reporting/reporting.module';
import { ReportingWorker } from './products/attendance/reporting/reporting.worker';
import { LeaveModule } from './products/attendance/leave/leave.module';
import { LeaveEventWorker } from './products/attendance/leave/leave-event.worker';
import { BillingModule } from './platform/billing/billing.module';
import { DunningWorker } from './platform/billing/application/dunning.worker';
import { PlatformTenantsModule } from './platform/control-plane/tenants/platform-tenants.module';
import { TenantDeletionWorker } from './platform/control-plane/tenants/tenant-deletion.worker';
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

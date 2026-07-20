import { Module } from '@nestjs/common';
import { AttendanceConfigModule } from './configuration/attendance-config.module';
import { AttendanceDashboardModule } from './dashboard/attendance-dashboard.module';
import { AttendanceSyncModule } from './sync/attendance-sync.module';
import { AttendanceVerificationModule } from './verification/attendance-verification.module';
import { BiometricsModule } from './biometrics/biometrics.module';
import { DeviceTrustModule } from './trust/device-trust.module';
import { FieldTrackingModule } from './field/field-tracking.module';
import { LeaveModule } from './leave/leave.module';
import { PayrollLockModule } from './payroll-lock/payroll-lock.module';
import { RegularizationModule } from './regularization/regularization.module';
import { ReportingModule } from './reporting/reporting.module';
import { RuntimeConfigModule } from './runtime-config/runtime-config.module';
import { SecurityAlertsModule } from './security-alerts/security-alerts.module';
import { AttendanceModule } from './core/attendance.module';

// The application root imports Attendance as one product while these internal
// capabilities remain independently testable and replaceable.
const ATTENDANCE_CAPABILITY_MODULES = [
  AttendanceModule,
  AttendanceConfigModule,
  AttendanceDashboardModule,
  DeviceTrustModule,
  BiometricsModule,
  AttendanceVerificationModule,
  SecurityAlertsModule,
  FieldTrackingModule,
  AttendanceSyncModule,
  RuntimeConfigModule,
  RegularizationModule,
  ReportingModule,
  PayrollLockModule,
  LeaveModule,
];

@Module({
  imports: ATTENDANCE_CAPABILITY_MODULES,
  exports: ATTENDANCE_CAPABILITY_MODULES,
})
export class AttendanceProductModule {}

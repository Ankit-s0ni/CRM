import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { BiometricsModule } from '../biometrics/biometrics.module';
import { SecurityAlertsModule } from '../security-alerts/security-alerts.module';
import { AttendanceVerificationController } from './attendance-verification.controller';
import { AttendanceVerificationService } from './attendance-verification.service';
import {
  DeviceIntegrityProvider,
  FaceMatchProvider,
} from './verification-providers';
import { DeviceIntegrityChallengeService } from './device-integrity-challenge.service';

@Module({
  imports: [AttendanceModule, BiometricsModule, SecurityAlertsModule],
  controllers: [AttendanceVerificationController],
  providers: [
    AttendanceVerificationService,
    DeviceIntegrityProvider,
    FaceMatchProvider,
    DeviceIntegrityChallengeService,
  ],
  exports: [AttendanceVerificationService, DeviceIntegrityChallengeService],
})
export class AttendanceVerificationModule {}

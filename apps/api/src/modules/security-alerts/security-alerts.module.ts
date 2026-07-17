import { Module } from '@nestjs/common';
import { BiometricsModule } from '../biometrics/biometrics.module';
import { SecurityAlertEvaluatorService } from './security-alert-evaluator.service';
import { SecurityAlertsController } from './security-alerts.controller';
import { SecurityAlertsService } from './security-alerts.service';

@Module({
  imports: [BiometricsModule],
  controllers: [SecurityAlertsController],
  providers: [SecurityAlertsService, SecurityAlertEvaluatorService],
  exports: [SecurityAlertEvaluatorService],
})
export class SecurityAlertsModule {}

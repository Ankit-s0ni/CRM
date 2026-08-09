import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AttendanceProductModule } from '../attendance/public';
import { PayrollProductModule } from '../payroll/public';
import { HrmsIntegrationController } from './hrms-integration.controller';
import { HrmsPlatformContractAdapter } from './hrms-platform-contract.adapter';
import { HrmsProductTokenGuard } from './hrms-product-token.guard';

@Module({
  imports: [
    AttendanceProductModule,
    PayrollProductModule,
    JwtModule.register({}),
  ],
  controllers: [HrmsIntegrationController],
  providers: [HrmsPlatformContractAdapter, HrmsProductTokenGuard],
})
export class HrmsProductModule {}

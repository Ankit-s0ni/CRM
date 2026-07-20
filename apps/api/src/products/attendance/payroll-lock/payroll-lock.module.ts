import { Module } from '@nestjs/common';
import { PayrollLockController } from './payroll-lock.controller';
import { PayrollLockService } from './payroll-lock.service';

@Module({
  controllers: [PayrollLockController],
  providers: [PayrollLockService],
  exports: [PayrollLockService],
})
export class PayrollLockModule {}

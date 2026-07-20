import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuleGuard } from '../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../../../platform/identity/public';
import {
  CreatePayrollLockDto,
  ReopenPayrollLockDto,
} from './dto/payroll-lock.dto';
import { PayrollLockService } from './payroll-lock.service';

@ApiTags('Payroll locks')
@ApiBearerAuth()
@RequireModule('PAYROLL')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.ATTENDANCE_PAYROLL_LOCK_MANAGE)
@Controller('payroll-locks')
export class PayrollLockController {
  constructor(private readonly locks: PayrollLockService) {}

  @Post()
  @ApiOperation({
    summary: 'Lock a finalized payroll period against a completed export',
  })
  lock(@Body() dto: CreatePayrollLockDto) {
    return this.locks.lock(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List payroll periods and immutable transition history',
  })
  list() {
    return this.locks.list();
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen a payroll period with an audited reason' })
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReopenPayrollLockDto,
  ) {
    return this.locks.reopen(id, dto);
  }
}

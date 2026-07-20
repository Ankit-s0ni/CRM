import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../shared/authorization/permissions.guard';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../../shared/authorization/require-permissions.decorator';
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/http/authenticated-user';
import { JwtTenantGuard } from '../../../platform/identity/public';
import { AttendanceDashboardService } from './attendance-dashboard.service';
import { AttendanceDashboardQueryDto } from './dto/attendance-dashboard-query.dto';

@ApiTags('Attendance Dashboard')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('attendance/dashboard')
export class AttendanceDashboardController {
  constructor(private readonly service: AttendanceDashboardService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_READ)
  @RequireAnyPermissions(
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.EMPLOYEES_REPORTS_READ,
  )
  @ApiOperation({
    summary: 'Get the shared Business Admin and HR Admin live board',
  })
  get(
    @Query() query: AttendanceDashboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.get(
      query,
      user.userId,
      new Set(user.permissions ?? []),
    );
  }
}

@ApiTags('HR Dashboard')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('dashboard')
export class HrDashboardController {
  constructor(private readonly service: AttendanceDashboardService) {}

  @Get('hr-summary')
  @RequireAnyPermissions(
    PERMISSIONS.DASHBOARD_ADMIN_READ,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.EMPLOYEES_REPORTS_READ,
  )
  @ApiOperation({
    summary: 'Get permission-filtered, employee-scoped HR action counts',
  })
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.hrSummary(user.userId, new Set(user.permissions ?? []));
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { AttendanceDashboardService } from './attendance-dashboard.service';
import { AttendanceDashboardQueryDto } from './dto/attendance-dashboard-query.dto';

@ApiTags('Attendance Dashboard')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('attendance/dashboard')
export class AttendanceDashboardController {
  constructor(private readonly service: AttendanceDashboardService) {}

  @Get()
  @RequirePermissions(
    PERMISSIONS.ATTENDANCE_RECORDS_READ,
    PERMISSIONS.EMPLOYEES_READ,
  )
  @ApiOperation({
    summary: 'Get the shared Business Admin and HR Admin live board',
  })
  get(@Query() query: AttendanceDashboardQueryDto) {
    return this.service.get(query);
  }
}

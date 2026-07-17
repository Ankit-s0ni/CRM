import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ModuleGuard } from '../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../shared/authorization/require-permissions.decorator';
import type { AuthenticatedUser } from '../../../shared/http/authenticated-user';
import { JwtTenantGuard } from '../../identity/jwt-tenant.guard';
import { AttendanceExceptionsService } from '../application/attendance-exceptions.service';
import { AttendanceQueryService } from '../application/attendance-query.service';
import {
  AttendanceDayQueryDto,
  AttendanceExceptionQueryDto,
  AttendanceMonthQueryDto,
  AttendanceRegisterQueryDto,
  CreateAttendanceExceptionDto,
  UpdateAttendanceExceptionDto,
} from './dto/attendance-query.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@ApiTags('Attendance records')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller()
export class AttendanceQueryController {
  constructor(
    private readonly queries: AttendanceQueryService,
    private readonly exceptions: AttendanceExceptionsService,
  ) {}

  @Get('attendance/register')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_READ)
  @ApiOperation({ summary: 'Get filtered tenant attendance register' })
  register(
    @Query() query: AttendanceRegisterQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.queries.register(query, request.user.roles);
  }

  @Get('attendance/employees/:employeeId/month')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_READ)
  @ApiOperation({
    summary: 'Get employee monthly attendance calendar and totals',
  })
  employeeMonth(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: AttendanceMonthQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.queries.employeeMonth(
      employeeId,
      query.month,
      request.user.roles,
    );
  }

  @Get('attendance/register/:employeeId/day')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_READ)
  @ApiOperation({
    summary: 'Get safe attendance evidence timeline for one day',
  })
  day(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: AttendanceDayQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.queries.day(employeeId, query.date, request.user.roles);
  }

  @Get('attendance-exceptions')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_EXCEPTIONS_READ)
  @ApiOperation({ summary: 'List manual attendance exceptions' })
  listExceptions(@Query() query: AttendanceExceptionQueryDto) {
    return this.exceptions.list(query);
  }

  @Post('attendance-exceptions')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_EXCEPTIONS_MANAGE)
  @ApiOperation({ summary: 'Create an OD, WFH, or other manual exception' })
  createException(@Body() dto: CreateAttendanceExceptionDto) {
    return this.exceptions.create(dto);
  }

  @Get('attendance-exceptions/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_EXCEPTIONS_READ)
  @ApiOperation({ summary: 'Get one attendance exception' })
  getException(@Param('id', ParseUUIDPipe) id: string) {
    return this.exceptions.get(id);
  }

  @Patch('attendance-exceptions/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_EXCEPTIONS_MANAGE)
  @ApiOperation({ summary: 'Update an unlocked attendance exception' })
  updateException(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceExceptionDto,
  ) {
    return this.exceptions.update(id, dto);
  }

  @Delete('attendance-exceptions/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_EXCEPTIONS_MANAGE)
  @ApiOperation({ summary: 'Delete an unlocked attendance exception' })
  removeException(@Param('id', ParseUUIDPipe) id: string) {
    return this.exceptions.remove(id);
  }
}

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventType } from '@prisma/client';
import type { Request } from 'express';
import { ModuleGuard } from '../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../../identity/jwt-tenant.guard';
import { AttendanceRuntimeService } from '../application/attendance-runtime.service';
import {
  AttendanceHistoryQueryDto,
  WebPunchDto,
} from './dto/attendance-runtime.dto';

@ApiTags('Attendance runtime')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('attendance')
export class AttendanceRuntimeController {
  constructor(private readonly runtime: AttendanceRuntimeService) {}

  @Post('check-in')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({
    summary: 'Start web attendance for the authenticated employee',
  })
  checkin(@Body() dto: WebPunchDto, @Req() request: Request) {
    return this.runtime.punch(EventType.CHECKIN, metadata(dto, request));
  }

  @Post('check-out')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({
    summary: 'Close web attendance for the authenticated employee',
  })
  checkout(@Body() dto: WebPunchDto, @Req() request: Request) {
    return this.runtime.punch(EventType.CHECKOUT, metadata(dto, request));
  }

  @Post('break-start')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Start an attendance break' })
  breakStart(@Body() dto: WebPunchDto, @Req() request: Request) {
    return this.runtime.punch(EventType.BREAK_START, metadata(dto, request));
  }

  @Post('break-end')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'End the current attendance break' })
  breakEnd(@Body() dto: WebPunchDto, @Req() request: Request) {
    return this.runtime.punch(EventType.BREAK_END, metadata(dto, request));
  }

  @Get('me/today')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({
    summary: 'Get today attendance state and safe event timeline',
  })
  today() {
    return this.runtime.today();
  }

  @Get('me/history')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({
    summary: 'Get authenticated employee monthly attendance history',
  })
  history(@Query() query: AttendanceHistoryQueryDto) {
    return this.runtime.history(query.month);
  }
}

function metadata(dto: WebPunchDto, request: Request) {
  return {
    requestId: dto.requestId,
    ipAddress: request.ip,
    userAgent: request.get('user-agent'),
  };
}

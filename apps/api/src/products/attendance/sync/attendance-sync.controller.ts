import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/http/authenticated-user';
import { JwtTenantGuard } from '../../../platform/identity/public';
import { AttendanceSyncService } from './attendance-sync.service';
import { AttendanceSyncDto } from './dto/attendance-sync.dto';

@ApiTags('Attendance offline sync')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('attendance/sync')
export class AttendanceSyncController {
  constructor(private readonly syncService: AttendanceSyncService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Replay an ordered offline attendance batch' })
  sync(
    @Body() dto: AttendanceSyncDto,
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.sync(dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      jwtDeviceId: user.deviceId,
    });
  }

  @Get(':clientEventUuid')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Get the durable outcome for an offline event' })
  status(
    @Param('clientEventUuid', new ParseUUIDPipe()) clientEventUuid: string,
  ) {
    return this.syncService.status(clientEventUuid);
  }
}

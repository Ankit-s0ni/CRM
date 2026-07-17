import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ModuleGuard } from '../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequireModule } from '../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { DeviceTrustService } from './device-trust.service';
import {
  DeviceDecisionDto,
  ListDevicesQueryDto,
  RegisterDeviceDto,
  ReplaceDeviceDto,
} from './dto/device.dto';

@ApiTags('Device trust')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('devices')
export class DeviceTrustController {
  constructor(private readonly devices: DeviceTrustService) {}

  @Post('register')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({
    summary: 'Register or refresh the authenticated employee device',
  })
  register(@Body() dto: RegisterDeviceDto, @Req() request: Request) {
    return this.devices.register(dto, request.ip);
  }

  @Get('me')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Get devices owned by the authenticated employee' })
  mine(@Headers('x-device-uuid') deviceUuid?: string) {
    return this.devices.mine(deviceUuid);
  }

  @Delete('me')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Remove the current device and revoke its session' })
  removeMine(@CurrentUser() user: AuthenticatedUser) {
    return this.devices.removeMine(user.deviceId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_DEVICES_READ)
  @ApiOperation({
    summary: 'List registered devices in the caller reporting scope',
  })
  list(@Query() query: ListDevicesQueryDto) {
    return this.devices.list(query);
  }

  @Post(':id/approve')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_DEVICES_MANAGE)
  @ApiOperation({ summary: 'Approve a pending employee device' })
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeviceDecisionDto,
  ) {
    return this.devices.approve(id, dto.reason);
  }

  @Post(':id/block')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_DEVICES_MANAGE)
  @ApiOperation({ summary: 'Block a device and revoke its refresh sessions' })
  block(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeviceDecisionDto,
  ) {
    return this.devices.block(id, dto.reason);
  }

  @Post(':id/replace')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_DEVICES_MANAGE)
  @ApiOperation({ summary: 'Replace an active device with a pending device' })
  replace(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReplaceDeviceDto,
  ) {
    return this.devices.replace(id, dto.newDeviceId, dto.reason);
  }
}

import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  ATTENDANCE_WORKSPACE_PERMISSIONS,
  PERMISSIONS,
} from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../shared/authorization/require-permissions.decorator';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { UpdateAttendanceCapabilitiesDto } from './dto/runtime-config.dto';
import { RuntimeConfigService } from './runtime-config.service';

@ApiTags('Mobile runtime')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('mobile')
export class MobileRuntimeConfigController {
  constructor(private readonly service: RuntimeConfigService) {}

  @Get('runtime-config')
  @RequirePermissions(PERMISSIONS.MOBILE_RUNTIME_READ)
  @ApiOperation({
    summary: 'Resolve the authenticated employee tenant runtime configuration',
  })
  async getRuntimeConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.getForCurrentEmployee(user.deviceId);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('ETag', result.etag);
    if (ifNoneMatch === result.etag) {
      response.status(304);
      return;
    }
    return { data: result.data };
  }
}

@ApiTags('Attendance capabilities')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('workspace/attendance-capabilities')
export class AttendanceCapabilitiesController {
  constructor(private readonly service: RuntimeConfigService) {}

  @Get()
  @RequireAnyPermissions(...ATTENDANCE_WORKSPACE_PERMISSIONS)
  @ApiOperation({ summary: 'Read entitled tenant attendance capabilities' })
  get() {
    return this.service.getAttendanceCapabilities();
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_CONFIG_MANAGE)
  @ApiOperation({ summary: 'Update entitled tenant attendance capabilities' })
  update(@Body() dto: UpdateAttendanceCapabilitiesDto) {
    return this.service.updateAttendanceCapabilities(dto);
  }
}

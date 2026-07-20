import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import { PlatformJwtGuard } from '../platform-auth/platform-jwt.guard';
import { PlatformPermissionGuard } from '../platform-auth/platform-permission.guard';
import { RequirePlatformPermissions } from '../platform-auth/require-platform-permissions.decorator';
import {
  ListSystemAlertsQueryDto,
  ListSystemAuditQueryDto,
  SystemAlertDecisionDto,
} from './dto/platform-operations.dto';
import { PlatformOperationsService } from './platform-operations.service';

@ApiTags('Platform Operations')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform')
export class PlatformOperationsController {
  constructor(private readonly operations: PlatformOperationsService) {}

  @Get('dashboard')
  @RequirePlatformPermissions('platform.dashboard.read')
  @ApiOperation({ summary: 'Get platform operational dashboard' })
  @ApiOkResponse({ description: 'Current platform KPIs and recent tenants' })
  dashboard() {
    return this.operations.dashboard();
  }

  @Get('audit-logs')
  @RequirePlatformPermissions('platform.audit.read')
  @ApiOperation({ summary: 'Search global platform audit logs' })
  auditLogs(@Query() query: ListSystemAuditQueryDto) {
    return this.operations.listAudit(query);
  }

  @Get('audit-logs/:id')
  @RequirePlatformPermissions('platform.audit.read')
  @ApiOperation({ summary: 'Get a fully attributed audit record' })
  auditLog(@Param('id', ParseUUIDPipe) id: string) {
    return this.operations.getAudit(id);
  }

  @Get('alerts')
  @RequirePlatformPermissions('platform.alerts.read')
  @ApiOperation({ summary: 'List system alerts' })
  alerts(@Query() query: ListSystemAlertsQueryDto) {
    return this.operations.listAlerts(query);
  }

  @Post('alerts/:id/acknowledge')
  @RequirePlatformPermissions('platform.alerts.manage')
  @ApiOperation({ summary: 'Acknowledge a system alert' })
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SystemAlertDecisionDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.operations.acknowledgeAlert(
      id,
      dto,
      actor,
      this.metadata(request),
    );
  }

  @Post('alerts/:id/resolve')
  @RequirePlatformPermissions('platform.alerts.manage')
  @ApiOperation({ summary: 'Resolve a system alert' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SystemAlertDecisionDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.operations.resolveAlert(id, dto, actor, this.metadata(request));
  }

  @Get('health')
  @RequirePlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Get non-throwing dependency health snapshot' })
  health() {
    return this.operations.healthSnapshot();
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: String(request.headers['x-request-id'] ?? ''),
    };
  }
}

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
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import { PlatformJwtGuard } from '../platform-auth/platform-jwt.guard';
import { PlatformPermissionGuard } from '../platform-auth/platform-permission.guard';
import { RequirePlatformPermissions } from '../platform-auth/require-platform-permissions.decorator';
import {
  CreateImpersonationDto,
  EndImpersonationDto,
} from './dto/impersonation.dto';
import { ImpersonationService } from './impersonation.service';

@Controller()
@ApiTags('Platform Impersonation')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
export class ImpersonationController {
  constructor(private readonly impersonation: ImpersonationService) {}
  @Get('platform/tenants/:tenantId/impersonation-targets')
  @RequirePlatformPermissions('platform.impersonation.create')
  @ApiOperation({
    summary:
      'List safe active tenant users available for support impersonation',
  })
  targets(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.impersonation.targets(tenantId);
  }
  @Post('platform/tenants/:tenantId/impersonations')
  @RequirePlatformPermissions('platform.impersonation.create')
  @ApiOperation({
    summary: 'Start a scoped, non-refreshable tenant support session',
  })
  start(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateImpersonationDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.impersonation.start(
      tenantId,
      dto,
      actor,
      this.metadata(request),
    );
  }
  @Get('platform/impersonations/:id')
  @RequirePlatformPermissions('platform.impersonation.create')
  @ApiOperation({ summary: 'Get current impersonation session status' })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedPlatformUser,
  ) {
    return this.impersonation.get(id, actor);
  }
  @Post('platform/impersonations/:id/end')
  @RequirePlatformPermissions('platform.impersonation.create')
  @ApiOperation({ summary: 'End an impersonation session immediately' })
  end(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndImpersonationDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.impersonation.end(
      id,
      dto.reason,
      actor,
      this.metadata(request),
    );
  }
  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: String(request.headers['x-request-id'] ?? ''),
    };
  }
}

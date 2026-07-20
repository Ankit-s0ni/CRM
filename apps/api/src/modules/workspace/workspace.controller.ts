import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { WorkspaceService } from './workspace.service';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';

type AuthenticatedRequest = Request & {
  user: { userId: string; tenantId: string; email: string; roles: string[] };
};

@ApiTags('Workspace')
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Resolve workspace availability by subdomain or tenant ID',
  })
  getStatus(
    @Query('subdomain') subdomain?: string,
    @Query('tenantId') tenantId?: string,
    @Headers('x-workspace-subdomain') workspaceHeader?: string,
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const resolvedTenantId = tenantId || tenantHeader;
    const resolvedSubdomain = subdomain || workspaceHeader;

    if (!resolvedTenantId && !resolvedSubdomain) {
      throw new BadRequestException('Subdomain or tenant ID required');
    }

    return this.workspaceService.getStatus({
      tenantId: resolvedTenantId,
      subdomain: resolvedSubdomain,
    });
  }

  @Get('modules')
  @UseGuards(JwtTenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MODULES_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List modules enabled for the authenticated workspace',
  })
  getModules(@Req() request: AuthenticatedRequest) {
    return this.workspaceService.getModules(request.user.tenantId);
  }

  @Get('modules/:key/health')
  @UseGuards(JwtTenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.MODULES_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get entitlement, dependencies, and setup health for one module',
  })
  getModuleHealth(
    @Req() request: AuthenticatedRequest,
    @Param('key') key: string,
  ) {
    return this.workspaceService.getModuleHealth(request.user.tenantId, key);
  }

  @Get('settings/health')
  @UseGuards(JwtTenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get permission-filtered workspace setup readiness',
  })
  getSettingsHealth(@CurrentUser() user: AuthenticatedUser) {
    return this.workspaceService.getSettingsHealth(
      user.tenantId,
      new Set(user.permissions ?? []),
    );
  }

  @Get('integrations')
  @UseGuards(JwtTenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get safe server integration configuration diagnostics',
  })
  getIntegrations() {
    return this.workspaceService.getIntegrationDiagnostics();
  }
}

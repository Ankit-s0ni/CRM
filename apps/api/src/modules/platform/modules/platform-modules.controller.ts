import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
  CreatePlatformModuleDto,
  ReplaceTenantCapabilityOverridesDto,
  ReplaceTenantModulesDto,
  UpdatePlatformModuleDto,
} from './dto/platform-module.dto';
import { PlatformModulesService } from './platform-modules.service';

@ApiTags('Platform Modules')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform/modules')
export class PlatformModulesController {
  constructor(private readonly modules: PlatformModulesService) {}
  @Get()
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'List CRM module registry' })
  list() {
    return this.modules.list();
  }
  @Post()
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Create a CRM module definition' })
  create(
    @Body() dto: CreatePlatformModuleDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.modules.create(dto, actor, this.metadata(request));
  }
  @Patch(':id')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Update module metadata and rules' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformModuleDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.modules.update(id, dto, actor, this.metadata(request));
  }
  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: String(request.headers['x-request-id'] ?? ''),
    };
  }
}

@ApiTags('Platform Product Catalog')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform/catalog')
export class PlatformCatalogController {
  constructor(private readonly modules: PlatformModulesService) {}

  @Get()
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'List customer-facing products, add-ons, and capabilities' })
  list() {
    return this.modules.catalog();
  }
}

@ApiTags('Platform Tenant Modules')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform/tenants/:tenantId/modules')
export class PlatformTenantModulesController {
  constructor(private readonly modules: PlatformModulesService) {}
  @Get()
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'Get effective module assignments for a tenant' })
  list(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.modules.tenantModules(tenantId);
  }
  @Put()
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Atomically replace active tenant modules' })
  replace(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: ReplaceTenantModulesDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.modules.replaceTenantModules(tenantId, dto, actor, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: String(request.headers['x-request-id'] ?? ''),
    });
  }
}

@ApiTags('Platform Tenant Entitlements')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform/tenants/:tenantId/entitlements')
export class PlatformTenantEntitlementsController {
  constructor(private readonly modules: PlatformModulesService) {}

  @Get()
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'Get plan, overrides, and effective tenant entitlements' })
  list(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.modules.tenantEntitlements(tenantId);
  }

  @Put('overrides')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Replace audited tenant capability overrides' })
  replace(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: ReplaceTenantCapabilityOverridesDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.modules.replaceTenantCapabilityOverrides(
      tenantId,
      dto,
      actor,
      {
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
        requestId: String(request.headers['x-request-id'] ?? ''),
      },
    );
  }
}

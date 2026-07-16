import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
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
  CreatePlatformTenantDto,
  ListPlatformTenantsQueryDto,
  TenantLifecycleDto,
  UpdatePlatformTenantDto,
} from './dto/platform-tenant.dto';
import { PlatformTenantsService } from './platform-tenants.service';

@ApiTags('Platform Tenants')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform/tenants')
export class PlatformTenantsController {
  constructor(private readonly tenants: PlatformTenantsService) {}

  @Get()
  @RequirePlatformPermissions('platform.tenants.read')
  @ApiOperation({ summary: 'List and filter tenant workspaces' })
  @ApiOkResponse({ description: 'Paginated tenant directory' })
  list(@Query() query: ListPlatformTenantsQueryDto) {
    return this.tenants.list(query);
  }

  @Post()
  @RequirePlatformPermissions('platform.tenants.create')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Provision a tenant and administrator invitation' })
  @ApiCreatedResponse({ description: 'Tenant provisioned atomically' })
  create(
    @Body() dto: CreatePlatformTenantDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    if (
      !idempotencyKey ||
      idempotencyKey.length < 16 ||
      idempotencyKey.length > 128
    ) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key must contain between 16 and 128 characters',
      });
    }
    return this.tenants.create(
      dto,
      idempotencyKey,
      actor,
      this.metadata(request),
    );
  }

  @Get(':id')
  @RequirePlatformPermissions('platform.tenants.read')
  @ApiOperation({ summary: 'Get tenant configuration and current usage' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.get(id);
  }

  @Patch(':id')
  @RequirePlatformPermissions('platform.tenants.update')
  @ApiOperation({ summary: 'Update safe tenant metadata' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformTenantDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.tenants.update(id, dto, actor, this.metadata(request));
  }

  @Post(':id/suspend')
  @RequirePlatformPermissions('platform.tenants.lifecycle')
  @ApiOperation({ summary: 'Suspend a tenant and revoke active sessions' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TenantLifecycleDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.tenants.suspend(id, dto, actor, this.metadata(request));
  }

  @Post(':id/reactivate')
  @RequirePlatformPermissions('platform.tenants.lifecycle')
  @ApiOperation({ summary: 'Reactivate a suspended tenant' })
  reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TenantLifecycleDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.tenants.reactivate(id, dto, actor, this.metadata(request));
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: String(request.headers['x-request-id'] ?? ''),
    };
  }
}

@ApiTags('Platform Plans')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform/plans')
export class PlatformPlansController {
  constructor(private readonly tenants: PlatformTenantsService) {}

  @Get()
  @RequirePlatformPermissions('platform.tenants.read')
  @ApiOperation({ summary: 'List subscription plans available for onboarding' })
  list() {
    return this.tenants.listPlans();
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import {
  PlatformJwtGuard,
  PlatformPermissionGuard,
  RequirePlatformPermissions,
  type AuthenticatedPlatformUser,
} from '../control-plane/public';
import {
  ConfigurePlanProductDto,
  TenantCapabilityOverrideDto,
  TenantLimitOverrideDto,
  TenantProductOverrideDto,
} from './dto/product-registration.dto';
import { ProductCommercialService } from './product-commercial.service';

@ApiTags('Platform Product Commercial Configuration')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform')
export class ProductCommercialController {
  constructor(private readonly commercial: ProductCommercialService) {}

  @Get('tenants/:tenantId/product-entitlements')
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'Get effective product entitlements for a tenant' })
  entitlements(@Param('tenantId') tenantId: string) {
    return this.commercial.tenantEntitlements(tenantId);
  }

  @Post('plans/:planId/products/:productKey/impact')
  @RequirePlatformPermissions('platform.plans.read')
  @ApiOperation({
    summary: 'Preview the tenant impact of a plan product change',
  })
  impact(
    @Param('planId') planId: string,
    @Param('productKey') productKey: string,
    @Body() dto: ConfigurePlanProductDto,
  ) {
    return this.commercial.planImpact(planId, productKey, dto);
  }

  @Put('plans/:planId/products/:productKey')
  @RequirePlatformPermissions('platform.plans.manage')
  @ApiOperation({ summary: 'Configure a product in a subscription plan' })
  configure(
    @Param('planId') planId: string,
    @Param('productKey') productKey: string,
    @Body() dto: ConfigurePlanProductDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.commercial.configurePlan(
      planId,
      productKey,
      dto,
      actor,
      metadata(request),
    );
  }

  @Put('tenants/:tenantId/products/:productKey/override')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Override tenant access to a product' })
  overrideProduct(
    @Param('tenantId') tenantId: string,
    @Param('productKey') productKey: string,
    @Body() dto: TenantProductOverrideDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.commercial.overrideProduct(
      tenantId,
      productKey,
      dto,
      actor,
      metadata(request),
    );
  }

  @Put('tenants/:tenantId/products/:productKey/capability-override')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Override a product capability for a tenant' })
  overrideCapability(
    @Param('tenantId') tenantId: string,
    @Param('productKey') productKey: string,
    @Body() dto: TenantCapabilityOverrideDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.commercial.overrideCapability(
      tenantId,
      productKey,
      dto,
      actor,
      metadata(request),
    );
  }

  @Put('tenants/:tenantId/products/:productKey/limit-override')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Override a product usage limit for a tenant' })
  overrideLimit(
    @Param('tenantId') tenantId: string,
    @Param('productKey') productKey: string,
    @Body() dto: TenantLimitOverrideDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.commercial.overrideLimit(
      tenantId,
      productKey,
      dto,
      actor,
      metadata(request),
    );
  }
}

function metadata(request: Request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get('user-agent'),
    requestId: String(request.headers['x-request-id'] ?? ''),
    idempotencyKey: String(request.headers['idempotency-key'] ?? ''),
  };
}

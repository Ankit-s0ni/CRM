import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ProductKey } from '@mariya-abdul/deltcrm-product-contracts';
import type { Request } from 'express';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { JwtTenantGuard } from '../identity/public';
import {
  AUTHENTICATED_PRODUCT_SERVICE,
  InternalProductServiceGuard,
} from './internal-product-service.guard';
import { ProductTokenDto } from './dto/product-token.dto';
import {
  ProductLifecycleAcknowledgementDto,
  ProductUsageDto,
} from './dto/product-registration.dto';
import { ProductIntegrationService } from './product-integration.service';
import { ProductOperationsService } from './product-operations.service';

@ApiTags('Product integration')
@Controller()
export class ProductIntegrationController {
  constructor(
    private readonly integration: ProductIntegrationService,
    private readonly operations: ProductOperationsService,
  ) {}

  @Get('.well-known/jwks.json')
  @ApiOperation({ summary: 'Get public keys for product token verification' })
  jwks() {
    return this.integration.jwks();
  }

  @Post('product-integration/token')
  @UseGuards(JwtTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Issue a short-lived token for an entitled product',
  })
  issueToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ProductTokenDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.integration.issueToken(user, body, requestId);
  }

  @Get('product-integration/entitlements')
  @UseGuards(JwtTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tenant product entitlements' })
  entitlements(@CurrentUser() user: AuthenticatedUser) {
    return this.integration.getEntitlements(user.tenantId);
  }

  @Get('product-integration/catalog')
  @UseGuards(JwtTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List products available to the current workspace' })
  catalog(@CurrentUser() user: AuthenticatedUser) {
    return this.operations.catalog(user.tenantId);
  }

  @Get('product-integration/products/:productKey/provisioning')
  @UseGuards(JwtTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get provisioning status for a workspace product' })
  provisioning(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productKey') productKey: string,
  ) {
    return this.integration.getProvisioningStatus(
      user.tenantId,
      productKey.toUpperCase(),
    );
  }

  @Get('product-integration/navigation')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @UseGuards(JwtTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get entitled product navigation for the current user',
  })
  navigation(@CurrentUser() user: AuthenticatedUser) {
    return this.integration.navigation(user);
  }

  @Get('internal/v1/products/:productKey/manifest')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Get a product manifest for service integration' })
  manifest(@Param('productKey') productKey: string) {
    return this.integration.manifest(productKey.toUpperCase());
  }

  @Get('internal/platform/v1/products/:productKey/manifest')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Get the active registered product manifest' })
  registeredManifest(@Param('productKey') productKey: string) {
    return this.integration.manifest(productKey.toUpperCase());
  }

  @Get('internal/platform/v1/products/:productKey/identity/:userId')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({
    summary: 'Validate a user identity for a registered product',
  })
  productIdentity(
    @Param('productKey') productKey: string,
    @Param('userId') userId: string,
    @Query('tenantId') tenantId: string,
    @Query('membershipId') membershipId: string,
  ) {
    return this.integration.getIdentityStatus({
      tenantId,
      userId,
      membershipId,
    });
  }

  @Get(
    'internal/platform/v1/products/:productKey/tenants/:tenantId/entitlements',
  )
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Get effective tenant entitlements for a product' })
  async productEntitlements(
    @Param('productKey') productKey: string,
    @Param('tenantId') tenantId: string,
  ) {
    const all = await this.integration.getEntitlements(tenantId);
    return {
      ...all,
      products: all.products.filter(
        ({ key }) => key === productKey.toUpperCase(),
      ),
    };
  }

  @Get(
    'internal/platform/v1/products/:productKey/tenants/:tenantId/provisioning',
  )
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Get tenant provisioning state for a product' })
  productProvisioning(
    @Param('productKey') productKey: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.integration.getProvisioningStatus(
      tenantId,
      productKey.toUpperCase(),
    );
  }

  @Put('internal/platform/v1/products/:productKey/tenants/:tenantId/usage')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Report tenant product usage to the Platform' })
  usage(
    @Req() request: Request & { [AUTHENTICATED_PRODUCT_SERVICE]: ProductKey },
    @Param('productKey') productKey: string,
    @Param('tenantId') tenantId: string,
    @Body() dto: ProductUsageDto,
  ) {
    return this.operations.reportUsage(
      request[AUTHENTICATED_PRODUCT_SERVICE],
      tenantId,
      productKey,
      dto,
    );
  }

  @Post(
    'internal/platform/v1/products/:productKey/tenants/:tenantId/lifecycle/acknowledgements',
  )
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Acknowledge a tenant product lifecycle event' })
  acknowledge(
    @Req() request: Request & { [AUTHENTICATED_PRODUCT_SERVICE]: ProductKey },
    @Param('productKey') productKey: string,
    @Param('tenantId') tenantId: string,
    @Body() dto: ProductLifecycleAcknowledgementDto,
  ) {
    return this.operations.acknowledge(
      request[AUTHENTICATED_PRODUCT_SERVICE],
      tenantId,
      productKey,
      dto,
    );
  }

  @Get('internal/v1/tenants/:tenantId/entitlements')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({
    summary: 'Get tenant entitlements for an internal product service',
  })
  internalEntitlements(@Param('tenantId') tenantId: string) {
    return this.integration.getEntitlements(tenantId);
  }

  @Get('internal/v1/tenants/:tenantId/users/:userId/identity-status')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({
    summary: 'Validate tenant membership for an internal product service',
  })
  identityStatus(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Query('membershipId') membershipId: string,
  ) {
    return this.integration.getIdentityStatus({
      tenantId,
      userId,
      membershipId,
    });
  }

  @Get('internal/v1/tenants/:tenantId/products/:productKey/status')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Get tenant product provisioning status' })
  status(
    @Param('tenantId') tenantId: string,
    @Param('productKey') productKey: string,
  ) {
    return this.integration.getProvisioningStatus(
      tenantId,
      productKey.toUpperCase(),
    );
  }
}

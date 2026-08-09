import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ProductKey } from '@deltcrm/product-contracts';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { JwtTenantGuard } from '../identity/public';
import { InternalProductServiceGuard } from './internal-product-service.guard';
import { ProductTokenDto } from './dto/product-token.dto';
import { ProductIntegrationService } from './product-integration.service';

@ApiTags('Product integration')
@Controller()
export class ProductIntegrationController {
  constructor(private readonly integration: ProductIntegrationService) {}

  @Get('.well-known/jwks.json')
  @ApiOperation({ summary: 'Get public keys for product token verification' })
  jwks() {
    return this.integration.jwks();
  }

  @Post('product-integration/token')
  @UseGuards(JwtTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a short-lived token for an entitled product' })
  issueToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ProductTokenDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.integration.issueToken(user, body.audience, requestId);
  }

  @Get('product-integration/entitlements')
  @UseGuards(JwtTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tenant product entitlements' })
  entitlements(@CurrentUser() user: AuthenticatedUser) {
    return this.integration.getEntitlements(user.tenantId);
  }

  @Get('product-integration/navigation')
  @UseGuards(JwtTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get entitled product navigation for the current user' })
  navigation(@CurrentUser() user: AuthenticatedUser) {
    return this.integration.navigation(user);
  }

  @Get('internal/v1/products/:productKey/manifest')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Get a product manifest for service integration' })
  manifest(@Param('productKey') productKey: string) {
    return this.integration.manifest(productKey.toUpperCase() as ProductKey);
  }

  @Get('internal/v1/tenants/:tenantId/entitlements')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Get tenant entitlements for an internal product service' })
  internalEntitlements(@Param('tenantId') tenantId: string) {
    return this.integration.getEntitlements(tenantId);
  }

  @Get('internal/v1/tenants/:tenantId/users/:userId/identity-status')
  @UseGuards(InternalProductServiceGuard)
  @ApiOperation({ summary: 'Validate tenant membership for an internal product service' })
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
      productKey.toUpperCase() as ProductKey,
    );
  }
}

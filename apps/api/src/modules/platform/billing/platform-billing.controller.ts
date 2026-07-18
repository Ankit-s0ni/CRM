import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  CreatePlatformPlanDto,
  DunningRetryDto,
  PlatformBillingQueryDto,
  UpdatePlatformPlanDto,
} from './dto/platform-billing.dto';
import { PlatformBillingService } from './platform-billing.service';

@ApiTags('Platform Billing')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform')
export class PlatformBillingController {
  constructor(private readonly billing: PlatformBillingService) {}

  @Get('plans')
  @RequirePlatformPermissions('platform.plans.read')
  @ApiOperation({ summary: 'List plans and module bundles' })
  plans() {
    return this.billing.plans();
  }

  @Post('plans')
  @RequirePlatformPermissions('platform.plans.manage')
  @ApiOperation({ summary: 'Create a subscription plan with fresh MFA' })
  createPlan(
    @Body() dto: CreatePlatformPlanDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.billing.createPlan(dto, actor, metadata(request));
  }

  @Patch('plans/:id')
  @RequirePlatformPermissions('platform.plans.manage')
  @ApiOperation({ summary: 'Update plan pricing, limits, and module bundle' })
  updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformPlanDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.billing.updatePlan(id, dto, actor, metadata(request));
  }

  @Get('invoices')
  @RequirePlatformPermissions('platform.billing.read')
  @ApiOperation({ summary: 'Search invoices across tenants' })
  invoices(@Query() query: PlatformBillingQueryDto) {
    return this.billing.invoices(query);
  }

  @Get('invoices/:id')
  @RequirePlatformPermissions('platform.billing.read')
  @ApiOperation({ summary: 'Get invoice, tax snapshot and payment attempts' })
  invoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.invoice(id);
  }

  @Get('payment-transactions')
  @RequirePlatformPermissions('platform.billing.read')
  @ApiOperation({ summary: 'Search provider payment attempts' })
  transactions(@Query() query: PlatformBillingQueryDto) {
    return this.billing.transactions(query);
  }

  @Get('dunning')
  @RequirePlatformPermissions('platform.billing.read')
  @ApiOperation({ summary: 'List subscriptions in dunning' })
  dunning(@Query() query: PlatformBillingQueryDto) {
    return this.billing.dunningQueue(query);
  }

  @Post('dunning/:subscriptionId/retry')
  @RequirePlatformPermissions('platform.dunning.manage')
  @ApiOperation({ summary: 'Retry payment with permission and fresh MFA' })
  retry(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Body() dto: DunningRetryDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.billing.retry(subscriptionId, dto, actor, metadata(request));
  }

  @Get('dashboard/billing')
  @RequirePlatformPermissions('platform.dashboard.read')
  @ApiOperation({ summary: 'Get authoritative revenue and billing KPIs' })
  dashboard() {
    return this.billing.billingDashboard();
  }

  @Get('health/payment-providers')
  @RequirePlatformPermissions('platform.health.read')
  @ApiOperation({ summary: 'Get provider latency and webhook health' })
  providerHealth() {
    return this.billing.providerHealth();
  }
}

function metadata(request: Request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get('user-agent'),
    requestId: String(request.headers['x-request-id'] ?? ''),
  };
}

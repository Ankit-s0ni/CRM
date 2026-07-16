import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { BillingAccessService } from './billing-access.service';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('billing')
export class BillingAccessController {
  constructor(private readonly billingAccessService: BillingAccessService) {}

  @Get('subscription')
  @RequirePermissions(PERMISSIONS.BILLING_SUBSCRIPTION_READ)
  @ApiOperation({ summary: 'Get the current workspace subscription' })
  subscription() {
    return this.billingAccessService.subscription();
  }
}

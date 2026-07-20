import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../../shared/authorization/require-permissions.decorator';
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/http/authenticated-user';
import { JwtTenantGuard } from '../../identity/public';
import { BillingService } from '../application/billing.service';
import {
  AddPaymentMethodDto,
  BillingInvoiceQueryDto,
  ChangePlanDto,
  UpdateBillingProfileDto,
} from './billing.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('profile')
  @RequirePermissions(PERMISSIONS.BILLING_SUBSCRIPTION_READ)
  @ApiOperation({ summary: 'Get tenant legal and tax billing profile' })
  profile() {
    return this.billing.profile();
  }

  @Patch('profile')
  @RequirePermissions(PERMISSIONS.BILLING_PROFILE_MANAGE)
  @ApiOperation({ summary: 'Update tenant legal and tax billing profile' })
  updateProfile(
    @Body() dto: UpdateBillingProfileDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.billing.updateProfile(dto, actor);
  }

  @Get('subscription')
  @RequirePermissions(PERMISSIONS.BILLING_SUBSCRIPTION_READ)
  @ApiOperation({ summary: 'Get current subscription, bundle and seat usage' })
  subscription() {
    return this.billing.subscription();
  }

  @Post('subscription/change-plan')
  @RequirePermissions(PERMISSIONS.BILLING_SUBSCRIPTION_MANAGE)
  @ApiOperation({ summary: 'Preview or confirm a validated plan change' })
  changePlan(
    @Body() dto: ChangePlanDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.billing.changePlan(dto, actor);
  }

  @Get('invoices')
  @RequirePermissions(PERMISSIONS.BILLING_INVOICES_READ)
  @ApiOperation({ summary: 'List tenant GST invoices' })
  invoices(@Query() query: BillingInvoiceQueryDto) {
    return this.billing.invoices(query);
  }

  @Get('invoices/:id')
  @RequirePermissions(PERMISSIONS.BILLING_INVOICES_READ)
  @ApiOperation({ summary: 'Get immutable invoice and payment evidence' })
  invoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.invoice(id);
  }

  @Get('invoices/:id/download')
  @RequirePermissions(PERMISSIONS.BILLING_INVOICES_READ)
  @ApiOperation({ summary: 'Create a short-lived private invoice download' })
  download(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.invoiceDownload(id);
  }

  @Get('payment-methods')
  @RequirePermissions(PERMISSIONS.BILLING_SUBSCRIPTION_READ)
  @ApiOperation({ summary: 'List masked tokenized payment methods' })
  paymentMethods() {
    return this.billing.paymentMethods();
  }

  @Post('payment-methods')
  @RequirePermissions(PERMISSIONS.BILLING_PAYMENT_METHODS_MANAGE)
  @ApiOperation({ summary: 'Attach a provider-tokenized payment method' })
  addPaymentMethod(
    @Body() dto: AddPaymentMethodDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.billing.addPaymentMethod(dto, actor);
  }

  @Delete('payment-methods/:id')
  @RequirePermissions(PERMISSIONS.BILLING_PAYMENT_METHODS_MANAGE)
  @ApiOperation({ summary: 'Revoke a tokenized payment method' })
  deletePaymentMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.billing.deletePaymentMethod(id, actor);
  }
}

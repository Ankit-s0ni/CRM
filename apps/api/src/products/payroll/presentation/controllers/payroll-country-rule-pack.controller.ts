import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../../platform/identity/public';
import { ModuleGuard } from '../../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../../shared/authorization/require-permissions.decorator';
import type { AuthenticatedUser } from '../../../../shared/http/authenticated-user';
import { CurrentUser } from '../../../../shared/http/current-user.decorator';
import {
  CreatePayrollCountryRulePackDto,
  PayrollCountryRulePackListResponseDto,
  PayrollCountryRulePackResponseDto,
  UpdatePayrollCountryRulePackStatusDto,
} from '../../application/dto/payroll-country-rule-pack.dto';
import { PayrollCountryRulePackService } from '../../application/services/payroll-country-rule-pack.service';

@ApiTags('Payroll country rule packs')
@ApiBearerAuth()
@RequireModule('PAYROLL')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('payroll/country-rule-packs')
export class PayrollCountryRulePackController {
  constructor(private readonly service: PayrollCountryRulePackService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_READ)
  @ApiOkResponse({ type: PayrollCountryRulePackListResponseDto })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.tenantId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Create a tenant country rule pack shell' })
  @ApiCreatedResponse({ type: PayrollCountryRulePackResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollCountryRulePackDto,
  ) {
    return this.service.create(actor(user), dto);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Activate, disable, or draft a country rule pack' })
  @ApiOkResponse({ type: PayrollCountryRulePackResponseDto })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollCountryRulePackStatusDto,
  ) {
    return this.service.updateStatus(actor(user), id, dto);
  }
}

function actor(user: AuthenticatedUser) {
  return { tenantId: user.tenantId, userId: user.userId };
}

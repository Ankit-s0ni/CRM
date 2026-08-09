import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ProductTokenClaims } from '@deltcrm/product-contracts';
import { HrmsPlatformContractAdapter } from './hrms-platform-contract.adapter';
import {
  HRMS_PRODUCT_IDENTITY,
  HrmsProductTokenGuard,
} from './hrms-product-token.guard';

@ApiTags('HRMS integration')
@Controller('api/hrms')
@UseGuards(HrmsProductTokenGuard)
@ApiBearerAuth()
export class HrmsIntegrationController {
  constructor(private readonly platform: HrmsPlatformContractAdapter) {}

  @Get('integration-context')
  @ApiOperation({ summary: 'Get the signed tenant HRMS integration context' })
  context(@Req() request: { [HRMS_PRODUCT_IDENTITY]: ProductTokenClaims }) {
    return this.platform.context(request[HRMS_PRODUCT_IDENTITY].tenantId);
  }
}

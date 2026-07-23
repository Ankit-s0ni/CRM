import { Body, Controller, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../platform/identity/public';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('POS Checkout')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard)
@Controller('pos/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @ApiOperation({ summary: 'Process POS checkout and deduct stock' })
  async processCheckout(@Body() dto: CheckoutDto) {
    try {
      return await this.checkoutService.processCheckout(dto);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}

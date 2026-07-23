import { Body, Controller, Get, Param, ParseUUIDPipe, UseGuards, BadRequestException, Res, Post } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../platform/identity/public';
import { OrdersService } from './orders.service';
import { ShareReceiptDto } from './dto/share-receipt.dto';

@ApiTags('POS Orders')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard)
@Controller('pos/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all POS orders' })
  async findAll() {
    try {
      return await this.ordersService.findAll();
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific order by ID with items' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.ordersService.findOne(id);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id/invoice/pdf')
  @ApiOperation({ summary: 'Download PDF invoice for order' })
  async downloadInvoicePdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    try {
      const pdfBuffer = await this.ordersService.generateInvoicePdf(id);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share order receipt via Email or WhatsApp' })
  async shareReceipt(@Param('id', ParseUUIDPipe) id: string, @Body() body: ShareReceiptDto) {
    try {
      return await this.ordersService.shareOrder(id, body.type as any, body.target);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}

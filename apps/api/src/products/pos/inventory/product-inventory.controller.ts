import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../platform/identity/public';
import { ProductInventoryService } from './product-inventory.service';
import { CreateProductInventoryDto, QueryProductInventoryDto } from './dto/product-inventory.dto';

@ApiTags('POS Product Inventory')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard)
@Controller('pos/inventory')
export class ProductInventoryController {
  constructor(private readonly service: ProductInventoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  async create(@Body() dto: CreateProductInventoryDto) {
    try {
      return await this.service.create(dto);
    } catch (error: any) {
      throw new BadRequestException(error.stack || error.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List products with pagination and search' })
  async findAll(@Query() query: QueryProductInventoryDto) {
    try {
      return await this.service.findAll(query);
    } catch (error: any) {
      throw new BadRequestException(error.stack || error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.service.findOne(id);
    } catch (error: any) {
      throw new BadRequestException(error.stack || error.message);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a product' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.service.remove(id);
    } catch (error: any) {
      throw new BadRequestException(error.stack || error.message);
    }
  }
}

import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../platform/identity/public';
import { ProductCategoryService } from './product-category.service';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/product-category.dto';

@ApiTags('POS Product Categories')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard)
@Controller('pos/categories')
export class ProductCategoryController {
  constructor(private readonly service: ProductCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product category' })
  async create(@Body() dto: CreateProductCategoryDto) {
    try {
      return await this.service.create(dto);
    } catch (error: any) {
      throw new BadRequestException(error.stack || error.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all product categories' })
  async findAll() {
    try {
      return await this.service.findAll();
    } catch (error: any) {
      throw new BadRequestException(error.stack || error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product category by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product category' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a product category' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}

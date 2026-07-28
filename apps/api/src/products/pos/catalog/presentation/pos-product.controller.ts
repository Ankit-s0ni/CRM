import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtTenantGuard } from '../../../../platform/identity/public';
import { ModuleGuard } from '../../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../../shared/authorization/require-permissions.decorator';
import { ProductExportService } from '../application/product-export.service';
import { PosProductService } from '../application/pos-product.service';
import {
  CreatePosProductDto,
  GenerateVariantsDto,
  PosProductLookupDto,
  PosProductQueryDto,
  PosVariantDto,
  PresignProductImageDto,
  PutBundleDto,
  UpdatePosProductDto,
} from './dto/pos-product.dto';

@ApiTags('POS catalog')
@ApiBearerAuth()
@RequireModule('POS')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('pos/products')
export class PosProductController {
  constructor(
    private readonly products: PosProductService,
    private readonly exports: ProductExportService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_READ)
  @ApiOperation({ summary: 'List products' })
  list(@Query() query: PosProductQueryDto) {
    return this.products.list(query);
  }

  // Declared before :id so "lookup" is never captured as a product id.
  @Get('lookup')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_READ)
  @ApiOperation({
    summary:
      'Resolve a product or variant by barcode or SKU (register hot path)',
  })
  lookup(@Query() query: PosProductLookupDto) {
    return this.products.lookup(query);
  }

  // Also declared before :id — otherwise ParseUUIDPipe rejects "export" as a bad id.
  @Get('export')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_READ)
  @ApiOperation({
    summary:
      'Export the catalog as CSV, in the same column order the import accepts',
  })
  async export(@Res() response: Response) {
    const csv = await this.exports.toCsv();
    response
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader(
        'Content-Disposition',
        'attachment; filename="pos-products.csv"',
      )
      .send(csv);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_READ)
  @ApiOperation({ summary: 'Read a product with its variants and bundle' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.get(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_CREATE)
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreatePosProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePosProductDto,
  ) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_DELETE)
  @ApiOperation({
    summary:
      'Deactivate a product (soft delete — historical sales must keep resolving)',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.deactivate(id);
  }

  @Post(':id/images/presign')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Presign a product image upload' })
  presignImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PresignProductImageDto,
  ) {
    return this.products.presignImage(
      id,
      dto.filename,
      dto.contentType,
      dto.fileSize,
    );
  }

  @Post(':id/variants')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Add a variant' })
  addVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PosVariantDto,
  ) {
    return this.products.addVariant(id, dto);
  }

  @Post(':id/variants/generate')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_UPDATE)
  @ApiOperation({
    summary:
      'Generate the variant matrix from attributes (additive, never destructive)',
  })
  generateVariants(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateVariantsDto,
  ) {
    return this.products.generateVariants(id, dto);
  }

  @Delete(':id/variants/:variantId')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Remove a variant' })
  removeVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.products.removeVariant(id, variantId);
  }

  @Put(':id/bundle')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Replace a bundle composition' })
  putBundle(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PutBundleDto) {
    return this.products.putBundle(id, dto);
  }
}

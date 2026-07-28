import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtTenantGuard } from '../../../../platform/identity/public';
import { ModuleGuard } from '../../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../../shared/authorization/require-permissions.decorator';
import { ProductImportService } from '../application/product-import.service';
import {
  PresignProductImportDto,
  RegisterProductImportDto,
} from './dto/product-import.dto';

@ApiTags('POS catalog')
@ApiBearerAuth()
@RequireModule('POS')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('pos/products')
export class ProductImportController {
  constructor(private readonly imports: ProductImportService) {}

  @Get('import/template')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_IMPORT)
  @ApiOperation({ summary: 'Column template for the import CSV' })
  template() {
    return this.imports.template();
  }

  @Post('import/presign')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_IMPORT)
  @ApiOperation({
    summary: 'Presign a CSV upload; the client then PUTs the file',
  })
  presign(@Body() dto: PresignProductImportDto) {
    return this.imports.presign(dto);
  }

  @Post('import')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_IMPORT)
  @ApiOperation({ summary: 'Register an uploaded CSV and queue it for import' })
  register(
    @Body() dto: RegisterProductImportDto,
    @Req() request: Request & { user?: { userId?: string } },
  ) {
    return this.imports.register(dto, request.user?.userId ?? '');
  }

  @Get('import/:id')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_IMPORT)
  @ApiOperation({ summary: 'Import job progress' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.imports.get(id);
  }

  @Get('import/:id/errors')
  @RequirePermissions(PERMISSIONS.POS_PRODUCT_IMPORT)
  @ApiOperation({ summary: 'Rows that failed to import' })
  errors(@Param('id', ParseUUIDPipe) id: string) {
    return this.imports.errors(id);
  }
}

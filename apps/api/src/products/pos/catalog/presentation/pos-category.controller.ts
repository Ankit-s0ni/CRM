import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../../platform/identity/public';
import { ModuleGuard } from '../../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../../shared/authorization/require-permissions.decorator';
import { PosCategoryService } from '../application/pos-category.service';
import {
  CreatePosCategoryDto,
  UpdatePosCategoryDto,
} from './dto/pos-category.dto';

@ApiTags('POS catalog')
@ApiBearerAuth()
@RequireModule('POS')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('pos/categories')
export class PosCategoryController {
  constructor(private readonly categories: PosCategoryService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.POS_CATEGORY_MANAGE)
  @ApiOperation({ summary: 'List product categories' })
  list() {
    return this.categories.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.POS_CATEGORY_MANAGE)
  @ApiOperation({ summary: 'Create a product category' })
  create(@Body() dto: CreatePosCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.POS_CATEGORY_MANAGE)
  @ApiOperation({ summary: 'Update a product category' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePosCategoryDto,
  ) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.POS_CATEGORY_MANAGE)
  @ApiOperation({
    summary:
      'Delete a category, or deactivate it when products or child categories still reference it',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }
}

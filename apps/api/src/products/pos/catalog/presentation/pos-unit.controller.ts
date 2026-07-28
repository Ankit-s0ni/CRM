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
import { PosUnitService } from '../application/pos-unit.service';
import { CreatePosUnitDto, UpdatePosUnitDto } from './dto/pos-unit.dto';

@ApiTags('POS catalog')
@ApiBearerAuth()
@RequireModule('POS')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('pos/units')
export class PosUnitController {
  constructor(private readonly units: PosUnitService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.POS_UNIT_MANAGE)
  @ApiOperation({ summary: 'List units of measure' })
  list() {
    return this.units.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.POS_UNIT_MANAGE)
  @ApiOperation({ summary: 'Create a unit of measure' })
  create(@Body() dto: CreatePosUnitDto) {
    return this.units.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.POS_UNIT_MANAGE)
  @ApiOperation({ summary: 'Update a unit of measure' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePosUnitDto,
  ) {
    return this.units.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.POS_UNIT_MANAGE)
  @ApiOperation({
    summary:
      'Delete a unit, or deactivate it when products or derived units still reference it',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.units.remove(id);
  }
}

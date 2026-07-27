import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../../platform/identity/public';
import { ModuleGuard } from '../../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../../shared/authorization/require-permissions.decorator';
import { PosSettingsService } from '../application/pos-settings.service';
import { UpdatePosSettingsDto } from './dto/pos-settings.dto';

@ApiTags('POS configuration')
@ApiBearerAuth()
@RequireModule('POS')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('pos')
export class PosSettingsController {
  constructor(private readonly settings: PosSettingsService) {}

  @Post('setup')
  @RequirePermissions(PERMISSIONS.POS_SETTINGS_MANAGE)
  @ApiOperation({
    summary:
      'Provision POS defaults for this workspace (idempotent: outlet, settings, invoice sequence, Oman VAT rates)',
  })
  setup() {
    return this.settings.setup();
  }

  @Get('settings')
  @RequirePermissions(PERMISSIONS.POS_SETTINGS_READ)
  @ApiOperation({ summary: 'Read POS settings for this workspace' })
  getSettings() {
    return this.settings.get();
  }

  @Put('settings')
  @RequirePermissions(PERMISSIONS.POS_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update POS settings for this workspace' })
  updateSettings(@Body() dto: UpdatePosSettingsDto) {
    return this.settings.update(dto);
  }

  @Get('outlets')
  @RequirePermissions(PERMISSIONS.POS_OUTLET_READ)
  @ApiOperation({ summary: 'List outlets for this workspace' })
  listOutlets() {
    return this.settings.listOutlets();
  }
}

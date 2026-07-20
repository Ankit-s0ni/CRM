import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../tenancy/http';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import {
  CompleteOnboardingDto,
  LogoPresignDto,
  UpdateTenantSettingsDto,
} from './dto/workspace-settings.dto';
import { WorkspaceSettingsService } from './workspace-settings.service';

@ApiTags('Tenant settings')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller()
export class WorkspaceSettingsController {
  constructor(private readonly service: WorkspaceSettingsService) {}

  @Get('tenant-settings')
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Get tenant attendance and company settings' })
  getSettings() {
    return this.service.get();
  }

  @Patch('tenant-settings')
  @RequirePermissions(PERMISSIONS.SETTINGS_UPDATE)
  @ApiOperation({ summary: 'Update tenant attendance and company settings' })
  updateSettings(@Body() dto: UpdateTenantSettingsDto) {
    return this.service.update(dto);
  }

  @Post('tenant-settings/logo/presign')
  @RequirePermissions(PERMISSIONS.SETTINGS_UPDATE)
  @ApiOperation({
    summary: 'Create a private tenant-prefixed company-logo upload URL',
  })
  presignLogo(@Body() dto: LogoPresignDto) {
    return this.service.presignLogo(dto);
  }

  @Get('onboarding/status')
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Get resumable onboarding progress' })
  onboardingStatus() {
    return this.service.status();
  }

  @Post('onboarding/complete')
  @RequirePermissions(PERMISSIONS.SETTINGS_UPDATE)
  @ApiOperation({ summary: 'Idempotently complete workspace onboarding' })
  completeOnboarding(@Body() dto: CompleteOnboardingDto) {
    return this.service.complete(dto);
  }
}

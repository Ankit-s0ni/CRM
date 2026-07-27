import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import { PlatformJwtGuard } from '../platform-auth/platform-jwt.guard';
import { PlatformPermissionGuard } from '../platform-auth/platform-permission.guard';
import { RequirePlatformPermissions } from '../platform-auth/require-platform-permissions.decorator';
import {
  ImportPlatformTranslationsDto,
  SavePlatformTranslationDto,
  UpdatePlatformTenantLocalePolicyDto,
} from './dto/platform-localization.dto';
import { PlatformLocalizationService } from './platform-localization.service';

@ApiTags('Platform Localization')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform/localization')
export class PlatformLocalizationController {
  constructor(private readonly localization: PlatformLocalizationService) {}

  @Get('packs')
  @RequirePlatformPermissions('platform.localization.read')
  @ApiOperation({ summary: 'List locale packs, coverage and release history' })
  listPacks() {
    return this.localization.listPacks();
  }

  @Get('packs/:locale')
  @RequirePlatformPermissions('platform.localization.read')
  @ApiOperation({ summary: 'Get a locale pack and its translation keys' })
  getPack(@Param('locale') locale: string, @Query('version') version?: string) {
    return this.localization.getPack(
      locale,
      version ? Number(version) : undefined,
    );
  }

  @Patch('packs/:locale/translations')
  @RequirePlatformPermissions('platform.localization.translate')
  @ApiOperation({ summary: 'Save a translation into the locale draft' })
  saveTranslation(
    @Param('locale') locale: string,
    @Body() dto: SavePlatformTranslationDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.localization.saveTranslation(
      locale,
      dto,
      actor,
      this.metadata(request),
    );
  }

  @Post('packs/:locale/review')
  @RequirePlatformPermissions('platform.localization.review')
  @ApiOperation({ summary: 'Submit a locale pack for review' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  review(
    @Param('locale') locale: string,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.localization.reviewPack(locale, actor, this.metadata(request));
  }

  @Post('packs/:locale/publish')
  @RequirePlatformPermissions('platform.localization.publish')
  @ApiOperation({ summary: 'Publish a reviewed locale pack' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  publish(
    @Param('locale') locale: string,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.localization.publishPack(locale, actor, this.metadata(request));
  }

  @Post('packs/:locale/rollback/:version')
  @RequirePlatformPermissions('platform.localization.publish')
  @ApiOperation({ summary: 'Restore an archived locale pack version' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  rollback(
    @Param('locale') locale: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.localization.rollbackPack(
      locale,
      version,
      actor,
      this.metadata(request),
    );
  }

  @Post('packs/:locale/archive/:version')
  @RequirePlatformPermissions('platform.localization.publish')
  @ApiOperation({ summary: 'Archive a non-active locale pack version' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  archive(
    @Param('locale') locale: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.localization.archivePack(
      locale,
      version,
      actor,
      this.metadata(request),
    );
  }

  @Post('packs/:locale/import')
  @RequirePlatformPermissions('platform.localization.translate')
  @ApiOperation({ summary: 'Validate or import a JSON translation payload' })
  import(
    @Param('locale') locale: string,
    @Body() dto: ImportPlatformTranslationsDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.localization.importTranslations(
      locale,
      dto,
      actor,
      this.metadata(request),
    );
  }

  @Get('tenants/:tenantId/policy')
  @RequirePlatformPermissions('platform.localization.read')
  @ApiOperation({ summary: 'Get a tenant localization policy and overrides' })
  tenantPolicy(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.localization.tenantPolicy(tenantId);
  }

  @Patch('tenants/:tenantId/policy')
  @RequirePlatformPermissions('platform.localization.tenants.manage')
  @ApiOperation({ summary: 'Update a tenant localization policy' })
  updateTenantPolicy(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdatePlatformTenantLocalePolicyDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.localization.updateTenantPolicy(
      tenantId,
      dto,
      actor,
      this.metadata(request),
    );
  }

  @Get('tenants/:tenantId/preview')
  @RequirePlatformPermissions('platform.localization.read')
  @ApiOperation({ summary: 'Preview a resolved tenant locale catalog' })
  preview(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('locale') locale: string,
  ) {
    return this.localization.previewTenant(tenantId, locale);
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: String(request.headers['x-request-id'] ?? ''),
    };
  }
}

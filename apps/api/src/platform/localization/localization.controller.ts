import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request, Response } from 'express';
import { JwtTenantGuard } from '../tenancy/http';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import {
  CreateTenantTranslationOverrideDto,
  UpdateTenantLocalePolicyDto,
  UpdateTenantTranslationOverrideDto,
} from './dto/localization.dto';
import {
  CreateTenantTranslationOverrideCommand,
  UpdateTenantLocalizationPolicyCommand,
  UpdateTenantTranslationOverrideCommand,
} from './application/commands/localization.commands';
import {
  GetTenantLocalizationCatalogQuery,
  GetTenantLocalizationPolicyQuery,
  ListTenantTranslationOverridesQuery,
} from './application/queries/localization.queries';

@ApiTags('Localization')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller()
export class LocalizationController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get('tenant-localization-policy')
  @RequirePermissions('workspace.localization.read')
  @ApiOperation({ summary: 'Get the tenant language and locale policy' })
  policy() {
    return this.queries.execute(new GetTenantLocalizationPolicyQuery());
  }

  @Patch('tenant-localization-policy')
  @RequirePermissions('workspace.localization.manage')
  @ApiOperation({ summary: 'Update the tenant language and locale policy' })
  updatePolicy(@Body() dto: UpdateTenantLocalePolicyDto) {
    return this.commands.execute(
      new UpdateTenantLocalizationPolicyCommand(dto),
    );
  }

  @Get('localization/catalog')
  @RequirePermissions('workspace.localization.read')
  @Header('Cache-Control', 'private, max-age=300, must-revalidate')
  @ApiOperation({ summary: 'Resolve a tenant-scoped localization catalog' })
  async catalog(
    @Query('language') language: string | undefined,
    @Query('namespaces') namespaces: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.queries.execute(
      new GetTenantLocalizationCatalogQuery(
        language,
        namespaces
          ?.split(',')
          .map((value) => value.trim())
          .filter(Boolean) ?? [],
      ),
    );
    response.setHeader('ETag', result.etag);
    if (request.headers['if-none-match'] === result.etag) {
      response.status(304);
      return;
    }
    return {
      data: {
        language: result.language,
        resolvedLocale: result.resolvedLocale,
        direction: result.direction,
        version: result.version,
        messages: result.messages,
      },
    };
  }

  @Get('tenant-localization-overrides')
  @RequirePermissions('workspace.localization.read')
  @ApiOperation({
    summary: 'List tenant terminology overrides and editable keys',
  })
  async listOverrides() {
    return {
      data: await this.queries.execute(
        new ListTenantTranslationOverridesQuery(),
      ),
    };
  }

  @Post('tenant-localization-overrides')
  @RequirePermissions('workspace.localization.overrides.manage')
  @ApiOperation({ summary: 'Create a tenant terminology override draft' })
  createOverride(@Body() dto: CreateTenantTranslationOverrideDto) {
    return this.commands.execute(
      new CreateTenantTranslationOverrideCommand(dto),
    );
  }

  @Patch('tenant-localization-overrides/:id')
  @RequirePermissions('workspace.localization.overrides.manage')
  @ApiOperation({
    summary: 'Update or transition a tenant terminology override',
  })
  updateOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantTranslationOverrideDto,
  ) {
    return this.commands.execute(
      new UpdateTenantTranslationOverrideCommand(id, dto),
    );
  }
}

import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetPublicLocalizationBootstrapQuery } from './application/queries/localization.queries';

@ApiTags('Public localization')
@Controller('public/localization')
export class PublicLocalizationController {
  constructor(private readonly queries: QueryBus) {}

  @Get('bootstrap')
  @ApiOperation({
    summary: 'Get published localization data for a workspace subdomain',
  })
  bootstrap(
    @Query('subdomain') subdomain: string,
    @Query('language') language?: string,
    @Query('namespaces') namespaces?: string,
  ) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain ?? '')) {
      throw new BadRequestException('A valid workspace subdomain is required');
    }
    return this.queries
      .execute(
        new GetPublicLocalizationBootstrapQuery(
          subdomain,
          language,
          namespaces
            ?.split(',')
            .map((value) => value.trim())
            .filter(Boolean) ?? [],
        ),
      )
      .then((data) => ({ data }));
  }
}

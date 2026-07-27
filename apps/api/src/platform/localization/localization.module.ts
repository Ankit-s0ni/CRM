import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { LOCALIZATION_COMMAND_HANDLERS } from './application/commands/localization-command.handlers';
import { LOCALIZATION_QUERY_HANDLERS } from './application/queries/localization-query.handlers';
import { LocalizationCommandService } from './application/services/localization-command.service';
import { LocalizationQueryService } from './application/services/localization-query.service';
import { TenantLocalizationPolicyRepository } from './infrastructure/tenant-localization-policy.repository';
import { LocalizationController } from './localization.controller';
import { PublicLocalizationController } from './public-localization.controller';
import { LocalizationCatalogReader } from './infrastructure/localization-catalog.reader';

@Module({
  imports: [CqrsModule],
  controllers: [LocalizationController, PublicLocalizationController],
  providers: [
    LocalizationCommandService,
    LocalizationQueryService,
    TenantLocalizationPolicyRepository,
    LocalizationCatalogReader,
    ...LOCALIZATION_COMMAND_HANDLERS,
    ...LOCALIZATION_QUERY_HANDLERS,
  ],
  exports: [LocalizationQueryService],
})
export class LocalizationModule {}

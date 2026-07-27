import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LocalizationQueryService } from '../services/localization-query.service';
import {
  GetTenantLocalizationCatalogQuery,
  GetTenantLocalizationPolicyQuery,
  GetPublicLocalizationBootstrapQuery,
  ListTenantTranslationOverridesQuery,
} from './localization.queries';

@QueryHandler(GetTenantLocalizationPolicyQuery)
export class GetTenantLocalizationPolicyHandler implements IQueryHandler<GetTenantLocalizationPolicyQuery> {
  constructor(private readonly localization: LocalizationQueryService) {}

  execute() {
    return this.localization.policy();
  }
}

@QueryHandler(GetTenantLocalizationCatalogQuery)
export class GetTenantLocalizationCatalogHandler implements IQueryHandler<GetTenantLocalizationCatalogQuery> {
  constructor(private readonly localization: LocalizationQueryService) {}

  execute(query: GetTenantLocalizationCatalogQuery) {
    return this.localization.catalog(query.language, query.namespaces);
  }
}

@QueryHandler(ListTenantTranslationOverridesQuery)
export class ListTenantTranslationOverridesHandler implements IQueryHandler<ListTenantTranslationOverridesQuery> {
  constructor(private readonly localization: LocalizationQueryService) {}

  execute() {
    return this.localization.listOverrides();
  }
}

@QueryHandler(GetPublicLocalizationBootstrapQuery)
export class GetPublicLocalizationBootstrapHandler implements IQueryHandler<GetPublicLocalizationBootstrapQuery> {
  constructor(private readonly localization: LocalizationQueryService) {}

  execute(query: GetPublicLocalizationBootstrapQuery) {
    return this.localization.publicBootstrap(
      query.subdomain,
      query.language,
      query.namespaces,
    );
  }
}

export const LOCALIZATION_QUERY_HANDLERS = [
  GetTenantLocalizationPolicyHandler,
  GetTenantLocalizationCatalogHandler,
  ListTenantTranslationOverridesHandler,
  GetPublicLocalizationBootstrapHandler,
];

import { Query } from '@nestjs/cqrs';

export type LocalizationCatalogResult = {
  language: string;
  resolvedLocale: string;
  direction: string;
  version: number;
  messages: Record<string, string>;
  etag: string;
};

export class GetTenantLocalizationPolicyQuery extends Query<unknown> {}

export class GetTenantLocalizationCatalogQuery extends Query<LocalizationCatalogResult> {
  constructor(
    public readonly language?: string,
    public readonly namespaces: string[] = [],
  ) {
    super();
  }
}

export class ListTenantTranslationOverridesQuery extends Query<unknown> {}

export class GetPublicLocalizationBootstrapQuery extends Query<unknown> {
  constructor(
    public readonly subdomain: string,
    public readonly language?: string,
    public readonly namespaces: string[] = [],
  ) {
    super();
  }
}

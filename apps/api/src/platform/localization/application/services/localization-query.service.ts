import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  isPublicLanguage,
  LOCALE_REGISTRY,
  publicLanguageForLocale,
  resolveCatalogLocale,
} from '../../localization.constants';
import { LocalizationCatalogReader } from '../../infrastructure/localization-catalog.reader';
import { TenantLocalizationPolicyRepository } from '../../infrastructure/tenant-localization-policy.repository';

@Injectable()
export class LocalizationQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: TenantLocalizationPolicyRepository,
    private readonly catalogs: LocalizationCatalogReader,
  ) {}

  async runtime(preferredLanguage?: string) {
    const policy = await this.policy();
    const language =
      preferredLanguage &&
      policy.allowUserPreference &&
      isPublicLanguage(preferredLanguage) &&
      policy.enabledLanguages.includes(preferredLanguage)
        ? preferredLanguage
        : policy.defaultLanguage;
    const resolvedLocale = resolveCatalogLocale(
      language,
      policy.regionalArabicLocale,
    );
    return {
      language,
      resolvedLocale,
      direction: LOCALE_REGISTRY[resolvedLocale].direction.toLowerCase(),
      enabledLanguages: policy.enabledLanguages,
      catalogVersion: policy.catalogVersion,
      allowUserPreference: policy.allowUserPreference,
      regionalArabicLocale: policy.regionalArabicLocale,
    };
  }

  async policy() {
    const policy = await this.prisma.forTenant(async (tx) => {
      const tenantId = this.policies.requireTenantId();
      return this.policies.getOrCreate(tx, tenantId);
    });
    return this.policies.toPublic(policy);
  }

  async catalog(languageValue?: string, namespaces: string[] = []) {
    return this.prisma.forTenant(async (tx) => {
      const tenantId = this.policies.requireTenantId();
      const policy = await this.policies.getOrCreate(tx, tenantId);
      return this.catalogs.read(
        tx,
        tenantId,
        policy,
        languageValue && isPublicLanguage(languageValue)
          ? languageValue
          : undefined,
        namespaces,
      );
    });
  }

  publicBootstrap(
    subdomainValue: string,
    languageValue?: string,
    namespaces: string[] = [],
  ) {
    const subdomain = subdomainValue.trim().toLowerCase();
    return this.prisma.forAdmin(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { subdomain },
        include: { localePolicy: true },
      });
      if (
        !tenant ||
        (tenant.status !== 'ACTIVE' && tenant.status !== 'TRIAL')
      ) {
        throw new NotFoundException('Workspace localization is unavailable');
      }
      const policy = tenant.localePolicy ?? {
        tenantId: tenant.id,
        defaultLocale: 'en',
        regionalLocale: 'ar',
        regionalOverrideReason: null,
        enabledLocales: ['en', 'ar'],
        allowUserPreference: false,
        allowTenantOverrides: false,
        catalogVersion: 1,
        updatedBy: null,
        updatedAt: tenant.updatedAt,
      };
      const catalog = await this.catalogs.read(
        tx,
        tenant.id,
        policy,
        languageValue && isPublicLanguage(languageValue)
          ? languageValue
          : undefined,
        namespaces,
      );
      return {
        policy: this.policies.toPublic(policy),
        catalog,
      };
    });
  }

  listOverrides() {
    return this.prisma.forTenant(async (tx) => {
      const tenantId = this.policies.requireTenantId();
      const [overrides, editableKeys] = await Promise.all([
        tx.tenantTranslationOverride.findMany({
          where: { tenantId },
          include: { key: true },
          orderBy: [{ locale: 'asc' }, { updatedAt: 'desc' }],
        }),
        tx.localizationKey.findMany({
          where: { isTenantEditable: true },
          select: {
            id: true,
            key: true,
            namespace: true,
            defaultMessage: true,
            description: true,
            placeholderSchema: true,
          },
          orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
        }),
      ]);
      return {
        overrides: overrides.map((override) => ({
          ...override,
          locale: publicLanguageForLocale(override.locale),
        })),
        editableKeys,
      };
    });
  }
}

import { Injectable } from '@nestjs/common';
import { LocalizationStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import {
  localeFallbackChain,
  LOCALE_REGISTRY,
  normalizeEnabledLanguages,
  publicLanguageForLocale,
  resolveCatalogLocale,
  type PublicLanguage,
} from '../localization.constants';

export type CatalogPolicy = {
  defaultLocale: string;
  regionalLocale: string;
  enabledLocales: string[];
  allowTenantOverrides: boolean;
  catalogVersion: number;
};

@Injectable()
export class LocalizationCatalogReader {
  async read(
    tx: PrismaTransaction,
    tenantId: string,
    policy: CatalogPolicy,
    requestedLanguage: PublicLanguage | undefined,
    namespaces: string[],
  ) {
    const defaultLanguage = publicLanguageForLocale(policy.defaultLocale);
    const enabledLanguages = normalizeEnabledLanguages(policy.enabledLocales);
    const language =
      requestedLanguage && enabledLanguages.includes(requestedLanguage)
        ? requestedLanguage
        : defaultLanguage;
    const resolvedLocale = resolveCatalogLocale(
      language,
      policy.regionalLocale,
    );
    const keyWhere: Prisma.LocalizationKeyWhereInput = namespaces.length
      ? { namespace: { in: namespaces } }
      : {};
    const keys = await tx.localizationKey.findMany({
      where: keyWhere,
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
    });
    const chain = localeFallbackChain(resolvedLocale);
    const packs = await tx.localePack.findMany({
      where: { locale: { in: chain }, status: LocalizationStatus.PUBLISHED },
      include: {
        translations: {
          where: {
            status: LocalizationStatus.PUBLISHED,
            keyId: { in: keys.map(({ id }) => id) },
          },
        },
      },
      orderBy: { version: 'desc' },
    });
    const latestByLocale = new Map<string, (typeof packs)[number]>();
    for (const pack of packs) {
      if (!latestByLocale.has(pack.locale)) {
        latestByLocale.set(pack.locale, pack);
      }
    }

    const messages = Object.fromEntries(
      keys.map((key) => [key.key, key.defaultMessage]),
    );
    for (const fallbackLocale of chain) {
      const pack = latestByLocale.get(fallbackLocale);
      for (const translation of pack?.translations ?? []) {
        const key = keys.find(({ id }) => id === translation.keyId);
        if (key) messages[key.key] = translation.value;
      }
    }
    if (policy.allowTenantOverrides) {
      const overrides = await tx.tenantTranslationOverride.findMany({
        where: {
          tenantId,
          locale: resolvedLocale,
          status: LocalizationStatus.PUBLISHED,
          keyId: { in: keys.map(({ id }) => id) },
        },
        orderBy: { version: 'desc' },
        include: { key: true },
      });
      const applied = new Set<string>();
      for (const override of overrides) {
        if (!applied.has(override.key.key)) {
          messages[override.key.key] = override.value;
          applied.add(override.key.key);
        }
      }
    }

    const version = Math.max(
      policy.catalogVersion,
      ...[...latestByLocale.values()].map(({ version }) => version),
    );
    const etag = `"${createHash('sha256')
      .update(
        `${tenantId}:${language}:${resolvedLocale}:${version}:${JSON.stringify(messages)}`,
      )
      .digest('base64url')
      .slice(0, 24)}"`;
    return {
      language,
      resolvedLocale,
      direction: LOCALE_REGISTRY[resolvedLocale].direction.toLowerCase(),
      version,
      messages,
      etag,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocalizationStatus, Prisma, type LocalePack } from '@prisma/client';
import type { PlatformTransaction } from '../../../shared/database/platform-database.service';
import { PlatformDatabaseService } from '../../../shared/database/platform-database.service';
import {
  assertMatchingPlaceholders,
  isSupportedLocale,
  localeFallbackChain,
  LOCALE_REGISTRY,
  REQUIRED_LOCALIZATION_NAMESPACES,
  regionalLocaleForCountry,
  type SupportedLocale,
} from '../../../platform/localization/localization.constants';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import {
  ImportPlatformTranslationsDto,
  SavePlatformTranslationDto,
  UpdatePlatformTenantLocalePolicyDto,
} from './dto/platform-localization.dto';

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class PlatformLocalizationService {
  constructor(private readonly database: PlatformDatabaseService) {}

  listPacks() {
    return this.database.transaction(async (tx) => {
      const requiredKeys = await tx.localizationKey.findMany({
        where: { namespace: { in: [...REQUIRED_LOCALIZATION_NAMESPACES] } },
        select: { id: true },
      });
      const packs = await tx.localePack.findMany({
        orderBy: [{ locale: 'asc' }, { version: 'desc' }],
        include: {
          translations: {
            where: { status: LocalizationStatus.PUBLISHED },
            select: { keyId: true },
          },
          _count: {
            select: {
              translations: {
                where: { status: LocalizationStatus.PUBLISHED },
              },
            },
          },
        },
      });
      const latest = new Map<string, (typeof packs)[number]>();
      for (const pack of packs) {
        if (!latest.has(pack.locale)) latest.set(pack.locale, pack);
      }
      const affectedCounts = await Promise.all(
        [...latest.keys()].map(
          async (locale) =>
            [
              locale,
              await tx.tenantLocalePolicy.count({
                where: {
                  OR: [
                    { defaultLocale: locale },
                    { regionalLocale: locale },
                    { enabledLocales: { has: locale } },
                  ],
                },
              }),
            ] as const,
        ),
      );
      const affectedByLocale = new Map(affectedCounts);
      return {
        data: [...latest.values()].map((pack) => {
          const effectiveKeys = new Set<string>();
          for (const fallbackLocale of localeFallbackChain(
            pack.locale as SupportedLocale,
          )) {
            for (const translation of latest.get(fallbackLocale)
              ?.translations ?? []) {
              effectiveKeys.add(translation.keyId);
            }
          }
          const requiredKeyIds = new Set(requiredKeys.map(({ id }) => id));
          const effectiveTranslatedKeys = [...effectiveKeys].filter((id) =>
            requiredKeyIds.has(id),
          ).length;
          return {
            ...pack,
            translations: undefined,
            coverage:
              pack.locale === 'en' || requiredKeys.length === 0
                ? 100
                : Math.round(
                    (effectiveTranslatedKeys / requiredKeys.length) * 100,
                  ),
            translatedKeys: pack._count.translations,
            effectiveTranslatedKeys,
            requiredKeys: requiredKeys.length,
            affectedTenants: affectedByLocale.get(pack.locale) ?? 0,
            versions: packs
              .filter(({ locale }) => locale === pack.locale)
              .map(({ version, status, publishedAt, publishedBy }) => ({
                version,
                status,
                publishedAt,
                publishedBy,
              })),
          };
        }),
      };
    });
  }

  getPack(locale: string, version?: number) {
    this.assertLocale(locale);
    return this.database.transaction(async (tx) => {
      const pack = await tx.localePack.findFirst({
        where: {
          locale,
          ...(version ? { version } : {}),
        },
        orderBy: { version: 'desc' },
        include: {
          translations: {
            include: { key: true },
            orderBy: { key: { key: 'asc' } },
          },
        },
      });
      if (!pack) this.notFound('Locale pack');
      const keys = await tx.localizationKey.findMany({
        orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
      });
      const translated = new Map(
        pack.translations.map((translation) => [
          translation.keyId,
          translation,
        ]),
      );
      return {
        data: {
          ...pack,
          keys: keys.map((key) => ({
            ...key,
            translation: translated.get(key.id) ?? null,
          })),
        },
      };
    });
  }

  saveTranslation(
    locale: string,
    dto: SavePlatformTranslationDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    this.assertLocale(locale);
    return this.database.transaction(async (tx) => {
      const key = await tx.localizationKey.findUnique({
        where: { key: dto.key },
      });
      if (!key) this.notFound('Localization key');
      this.validateValue(key.defaultMessage, dto.value);
      const pack = await this.ensureDraftPack(tx, locale);
      const previous = await tx.localeTranslation.findUnique({
        where: {
          localePackId_keyId: { localePackId: pack.id, keyId: key.id },
        },
      });
      const translation = await tx.localeTranslation.upsert({
        where: {
          localePackId_keyId: { localePackId: pack.id, keyId: key.id },
        },
        create: {
          localePackId: pack.id,
          keyId: key.id,
          value: dto.value.trim(),
          status: LocalizationStatus.DRAFT,
        },
        update: {
          value: dto.value.trim(),
          status: LocalizationStatus.DRAFT,
          reviewedAt: null,
          reviewedBy: null,
        },
        include: { key: true },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.localization.translation.saved',
        {
          locale,
          version: pack.version,
          key: key.key,
          previous: previous?.value ?? null,
          value: translation.value,
        },
      );
      return { data: { pack, translation } };
    });
  }

  reviewPack(
    locale: string,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    this.assertLocale(locale);
    return this.database.transaction(async (tx) => {
      const pack = await tx.localePack.findFirst({
        where: { locale, status: LocalizationStatus.DRAFT },
        orderBy: { version: 'desc' },
      });
      if (!pack) this.notFound('Draft locale pack');
      await tx.localeTranslation.updateMany({
        where: { localePackId: pack.id },
        data: {
          status: LocalizationStatus.REVIEW,
          reviewedBy: actor.platformUserId,
          reviewedAt: new Date(),
        },
      });
      const updated = await tx.localePack.update({
        where: { id: pack.id },
        data: { status: LocalizationStatus.REVIEW },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.localization.pack.reviewed',
        {
          locale,
          version: pack.version,
        },
      );
      return { data: updated };
    });
  }

  publishPack(
    locale: string,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    this.assertLocale(locale);
    return this.database.transaction(async (tx) => {
      const pack = await tx.localePack.findFirst({
        where: {
          locale,
          status: LocalizationStatus.REVIEW,
        },
        orderBy: { version: 'desc' },
        include: { translations: { include: { key: true } } },
      });
      if (!pack) this.notFound('Publishable locale pack');
      if (
        pack.translations.some(
          ({ status }) => status !== LocalizationStatus.REVIEW,
        )
      ) {
        throw new BadRequestException({
          code: 'LOCALIZATION_REVIEW_REQUIRED',
          message:
            'Every changed translation must be reviewed before publishing',
        });
      }
      if (locale === 'ar') {
        const required = await tx.localizationKey.findMany({
          where: { namespace: { in: [...REQUIRED_LOCALIZATION_NAMESPACES] } },
        });
        const translatedIds = new Set(
          pack.translations.map(({ keyId }) => keyId),
        );
        const missing = required
          .filter(({ id }) => !translatedIds.has(id))
          .map(({ key }) => key);
        if (missing.length) {
          throw new BadRequestException({
            code: 'LOCALIZATION_REQUIRED_KEYS_MISSING',
            message: 'Required tenant dashboard translations are missing',
            details: { missing },
          });
        }
      }
      await tx.localePack.updateMany({
        where: { locale, status: LocalizationStatus.PUBLISHED },
        data: { status: LocalizationStatus.ARCHIVED },
      });
      await tx.localeTranslation.updateMany({
        where: { localePackId: pack.id },
        data: { status: LocalizationStatus.PUBLISHED },
      });
      const published = await tx.localePack.update({
        where: { id: pack.id },
        data: {
          status: LocalizationStatus.PUBLISHED,
          publishedAt: new Date(),
          publishedBy: actor.platformUserId,
        },
      });
      await tx.tenantLocalePolicy.updateMany({
        where: {
          OR: [
            { defaultLocale: locale },
            { regionalLocale: locale },
            { enabledLocales: { has: locale } },
          ],
        },
        data: { catalogVersion: { increment: 1 } },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.localization.pack.published',
        {
          locale,
          version: pack.version,
        },
      );
      return { data: published };
    });
  }

  rollbackPack(
    locale: string,
    version: number,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    this.assertLocale(locale);
    return this.database.transaction(async (tx) => {
      const target = await tx.localePack.findUnique({
        where: { locale_version: { locale, version } },
      });
      if (!target || target.status !== LocalizationStatus.ARCHIVED) {
        throw new BadRequestException({
          code: 'LOCALIZATION_ROLLBACK_TARGET_INVALID',
          message: 'Only an archived pack version can be restored',
        });
      }
      await tx.localePack.updateMany({
        where: { locale, status: LocalizationStatus.PUBLISHED },
        data: { status: LocalizationStatus.ARCHIVED },
      });
      await tx.localePack.update({
        where: { id: target.id },
        data: {
          status: LocalizationStatus.PUBLISHED,
          publishedAt: new Date(),
          publishedBy: actor.platformUserId,
        },
      });
      await tx.tenantLocalePolicy.updateMany({
        where: {
          OR: [
            { defaultLocale: locale },
            { regionalLocale: locale },
            { enabledLocales: { has: locale } },
          ],
        },
        data: { catalogVersion: { increment: 1 } },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.localization.pack.rolled_back',
        {
          locale,
          version,
        },
      );
      return { data: { ...target, status: LocalizationStatus.PUBLISHED } };
    });
  }

  archivePack(
    locale: string,
    version: number,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    this.assertLocale(locale);
    return this.database.transaction(async (tx) => {
      const pack = await tx.localePack.findUnique({
        where: { locale_version: { locale, version } },
      });
      if (!pack) this.notFound('Locale pack');
      if (pack.status === LocalizationStatus.PUBLISHED) {
        throw new BadRequestException({
          code: 'LOCALIZATION_ACTIVE_RELEASE_ARCHIVE_FORBIDDEN',
          message: 'Publish a replacement before archiving the active release',
        });
      }
      if (pack.status === LocalizationStatus.ARCHIVED) {
        return { data: pack };
      }
      await tx.localeTranslation.updateMany({
        where: { localePackId: pack.id },
        data: { status: LocalizationStatus.ARCHIVED },
      });
      const archived = await tx.localePack.update({
        where: { id: pack.id },
        data: { status: LocalizationStatus.ARCHIVED },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.localization.pack.archived',
        {
          locale,
          version,
        },
      );
      return { data: archived };
    });
  }

  importTranslations(
    locale: string,
    dto: ImportPlatformTranslationsDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    this.assertLocale(locale);
    return this.database.transaction(async (tx) => {
      const keys = await tx.localizationKey.findMany({
        where: { key: { in: dto.translations.map(({ key }) => key) } },
      });
      const keyByName = new Map(keys.map((key) => [key.key, key]));
      const errors = dto.translations.flatMap((row, index) => {
        const key = keyByName.get(row.key);
        if (!key)
          return [{ row: index + 1, key: row.key, error: 'UNKNOWN_KEY' }];
        try {
          this.validateValue(key.defaultMessage, row.value);
          return [];
        } catch {
          return [
            {
              row: index + 1,
              key: row.key,
              error: 'INVALID_PLACEHOLDERS_OR_HTML',
            },
          ];
        }
      });
      if (dto.dryRun || errors.length) {
        return {
          data: {
            dryRun: true,
            valid: errors.length === 0,
            accepted: dto.translations.length - errors.length,
            errors,
          },
        };
      }
      const pack = await this.ensureDraftPack(tx, locale);
      for (const row of dto.translations) {
        const key = keyByName.get(row.key)!;
        await tx.localeTranslation.upsert({
          where: {
            localePackId_keyId: { localePackId: pack.id, keyId: key.id },
          },
          create: {
            localePackId: pack.id,
            keyId: key.id,
            value: row.value.trim(),
          },
          update: {
            value: row.value.trim(),
            status: LocalizationStatus.DRAFT,
            reviewedAt: null,
            reviewedBy: null,
          },
        });
      }
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.localization.pack.imported',
        {
          locale,
          version: pack.version,
          rows: dto.translations.length,
        },
      );
      return {
        data: { dryRun: false, valid: true, accepted: dto.translations.length },
      };
    });
  }

  tenantPolicy(tenantId: string) {
    return this.database.transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: {
          localePolicy: true,
          translationOverrides: {
            include: { key: true },
            orderBy: [{ locale: 'asc' }, { updatedAt: 'desc' }],
          },
        },
      });
      if (!tenant) this.notFound('Tenant');
      const policy =
        tenant.localePolicy ?? (await this.createTenantPolicy(tx, tenantId));
      const suggestedRegionalLocale = await this.suggestedRegionalLocale(
        tx,
        tenantId,
      );
      const offices = await tx.officeLocation.findMany({
        where: { tenantId, countryCode: { not: null } },
        select: { id: true, officeName: true, countryCode: true },
        orderBy: { createdAt: 'asc' },
      });
      return {
        data: {
          policy,
          tenant: {
            id: tenant.id,
            companyName: tenant.companyName,
            subdomain: tenant.subdomain,
          },
          offices,
          suggestedRegionalLocale,
          overrides: tenant.translationOverrides,
        },
      };
    });
  }

  updateTenantPolicy(
    tenantId: string,
    dto: UpdatePlatformTenantLocalePolicyDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    if (!dto.enabledLocales.includes(dto.defaultLocale)) {
      throw new BadRequestException({
        code: 'LOCALIZATION_DEFAULT_NOT_ENABLED',
        message: 'The default locale must be enabled',
      });
    }
    return this.database.transaction(async (tx) => {
      const suggested = await this.suggestedRegionalLocale(tx, tenantId);
      if (dto.regionalLocale !== suggested && !dto.overrideReason) {
        throw new BadRequestException({
          code: 'LOCALIZATION_REGION_OVERRIDE_REASON_REQUIRED',
          message:
            'A reason is required when overriding the tenant market locale',
          details: { suggested },
        });
      }
      const current =
        (await tx.tenantLocalePolicy.findUnique({ where: { tenantId } })) ??
        (await this.createTenantPolicy(tx, tenantId));
      const updated = await tx.tenantLocalePolicy.update({
        where: { tenantId },
        data: {
          defaultLocale: dto.defaultLocale,
          regionalLocale: dto.regionalLocale,
          regionalOverrideReason:
            dto.regionalLocale === suggested
              ? null
              : dto.overrideReason?.trim(),
          enabledLocales: dto.enabledLocales,
          allowUserPreference: dto.allowUserPreference,
          allowTenantOverrides: dto.allowTenantOverrides,
          catalogVersion: { increment: 1 },
          updatedBy: actor.platformUserId,
        },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.localization.tenant_policy.updated',
        {
          tenantId,
          suggested,
          overrideReason: dto.overrideReason ?? null,
          oldValue: current,
          newValue: updated,
        },
        tenantId,
      );
      return { data: updated };
    });
  }

  previewTenant(tenantId: string, localeValue: string) {
    this.assertLocale(localeValue);
    return this.database.transaction(async (tx) => {
      const policy =
        (await tx.tenantLocalePolicy.findUnique({ where: { tenantId } })) ??
        (await this.createTenantPolicy(tx, tenantId));
      const locale = localeValue;
      const keys = await tx.localizationKey.findMany({
        where: { namespace: { in: [...REQUIRED_LOCALIZATION_NAMESPACES] } },
      });
      const messages = Object.fromEntries(
        keys.map((key) => [key.key, key.defaultMessage]),
      );
      for (const currentLocale of localeFallbackChain(locale)) {
        const pack = await tx.localePack.findFirst({
          where: {
            locale: currentLocale,
            status: LocalizationStatus.PUBLISHED,
          },
          orderBy: { version: 'desc' },
          include: {
            translations: {
              where: {
                keyId: { in: keys.map(({ id }) => id) },
                status: LocalizationStatus.PUBLISHED,
              },
            },
          },
        });
        for (const translation of pack?.translations ?? []) {
          const key = keys.find(({ id }) => id === translation.keyId);
          if (key) messages[key.key] = translation.value;
        }
      }
      if (policy.allowTenantOverrides) {
        const overrides = await tx.tenantTranslationOverride.findMany({
          where: { tenantId, locale, status: LocalizationStatus.PUBLISHED },
          include: { key: true },
          orderBy: { version: 'desc' },
        });
        const seen = new Set<string>();
        for (const override of overrides) {
          if (!seen.has(override.key.key)) {
            messages[override.key.key] = override.value;
            seen.add(override.key.key);
          }
        }
      }
      return {
        data: {
          locale,
          direction: LOCALE_REGISTRY[locale].direction.toLowerCase(),
          messages,
        },
      };
    });
  }

  private async ensureDraftPack(
    tx: PlatformTransaction,
    locale: SupportedLocale,
  ): Promise<LocalePack> {
    const draft = await tx.localePack.findFirst({
      where: {
        locale,
        status: { in: [LocalizationStatus.DRAFT, LocalizationStatus.REVIEW] },
      },
      orderBy: { version: 'desc' },
    });
    if (draft) {
      if (draft.status === LocalizationStatus.REVIEW) {
        return tx.localePack.update({
          where: { id: draft.id },
          data: { status: LocalizationStatus.DRAFT },
        });
      }
      return draft;
    }
    const previous = await tx.localePack.findFirst({
      where: { locale },
      orderBy: { version: 'desc' },
      include: { translations: true },
    });
    const definition = LOCALE_REGISTRY[locale];
    const created = await tx.localePack.create({
      data: {
        locale,
        parentLocale: definition.parentLocale,
        displayName: definition.displayName,
        nativeName: definition.nativeName,
        direction: definition.direction,
        version: (previous?.version ?? 0) + 1,
      },
    });
    if (previous?.translations.length) {
      await tx.localeTranslation.createMany({
        data: previous.translations.map((translation) => ({
          localePackId: created.id,
          keyId: translation.keyId,
          value: translation.value,
          status: LocalizationStatus.DRAFT,
        })),
      });
    }
    return created;
  }

  private async createTenantPolicy(tx: PlatformTransaction, tenantId: string) {
    const regionalLocale = await this.suggestedRegionalLocale(tx, tenantId);
    return tx.tenantLocalePolicy.create({
      data: {
        tenantId,
        defaultLocale: 'en',
        regionalLocale,
        enabledLocales: ['en', 'ar'],
      },
    });
  }

  private async suggestedRegionalLocale(
    tx: PlatformTransaction,
    tenantId: string,
  ) {
    const office = await tx.officeLocation.findFirst({
      where: { tenantId, countryCode: { not: null } },
      select: { countryCode: true },
    });
    return regionalLocaleForCountry(office?.countryCode);
  }

  private validateValue(source: string, translated: string) {
    if (/<\/?[a-z][^>]*>/i.test(translated)) {
      throw new BadRequestException({
        code: 'LOCALIZATION_HTML_NOT_ALLOWED',
        message: 'Translations cannot contain raw HTML',
      });
    }
    const mismatch = assertMatchingPlaceholders(source, translated);
    if (mismatch) {
      throw new BadRequestException({
        code: 'LOCALIZATION_PLACEHOLDER_MISMATCH',
        message: 'Translation placeholders do not match the source',
        details: mismatch,
      });
    }
  }

  private audit(
    tx: PlatformTransaction,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
    action: string,
    newValue: unknown,
    tenantId?: string,
  ) {
    return tx.systemAuditLog.create({
      data: {
        actorPlatformUserId: actor.platformUserId,
        tenantId,
        action,
        module: 'localization',
        newValue: newValue as Prisma.InputJsonValue,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        requestId: metadata.requestId,
      },
    });
  }

  private assertLocale(locale: string): asserts locale is SupportedLocale {
    if (!isSupportedLocale(locale)) {
      throw new BadRequestException({
        code: 'LOCALIZATION_LOCALE_UNSUPPORTED',
        message: 'Unsupported locale',
      });
    }
  }

  private notFound(subject: string): never {
    throw new NotFoundException({
      code: 'NOT_FOUND',
      message: `${subject} not found`,
    });
  }
}

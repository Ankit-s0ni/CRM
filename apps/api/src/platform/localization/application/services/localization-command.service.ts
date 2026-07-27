import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocalizationStatus } from '@prisma/client';
import { AuditService } from '../../../audit/public';
import { TenantContextService } from '../../../tenancy/public';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  assertMatchingPlaceholders,
  publicLanguageForLocale,
  resolveCatalogLocale,
  type PublicLanguage,
} from '../../localization.constants';
import {
  CreateTenantTranslationOverrideDto,
  UpdateTenantLocalePolicyDto,
  UpdateTenantTranslationOverrideDto,
} from '../../dto/localization.dto';
import { TenantLocalizationPolicyRepository } from '../../infrastructure/tenant-localization-policy.repository';

@Injectable()
export class LocalizationCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly audit: AuditService,
    private readonly policies: TenantLocalizationPolicyRepository,
  ) {}

  async updatePolicy(dto: UpdateTenantLocalePolicyDto) {
    if (!dto.enabledLanguages.includes(dto.defaultLanguage)) {
      throw new BadRequestException({
        code: 'LOCALIZATION_DEFAULT_NOT_ENABLED',
        message: 'The default language must be enabled',
      });
    }

    return this.prisma.forTenant(async (tx) => {
      const tenantId = this.policies.requireTenantId();
      const current = await this.policies.getOrCreate(tx, tenantId);
      const updated = await tx.tenantLocalePolicy.update({
        where: { tenantId },
        data: {
          defaultLocale: dto.defaultLanguage,
          enabledLocales: dto.enabledLanguages,
          allowUserPreference: dto.allowUserPreference,
          catalogVersion: { increment: 1 },
          updatedBy: this.tenantContext.userId,
        },
      });
      await tx.tenantSettings.updateMany({
        where: { tenantId },
        data: { locale: dto.defaultLanguage },
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'workspace.localization.policy.updated',
        module: 'localization',
        entityType: 'TenantLocalePolicy',
        oldValue: current,
        newValue: updated,
      });
      return this.policies.toPublic(updated);
    });
  }

  createOverride(dto: CreateTenantTranslationOverrideDto) {
    return this.prisma.forTenant(async (tx) => {
      const tenantId = this.policies.requireTenantId();
      const policy = await this.policies.getOrCreate(tx, tenantId);
      if (!policy.allowTenantOverrides) {
        throw new ForbiddenException({
          code: 'LOCALIZATION_OVERRIDES_DISABLED',
          message: 'Tenant wording overrides are disabled by platform policy',
        });
      }
      if (!policy.enabledLocales.includes(dto.locale)) {
        throw new BadRequestException({
          code: 'LOCALIZATION_LOCALE_NOT_ENABLED',
          message: 'The override language is not enabled',
        });
      }

      const locale = resolveCatalogLocale(
        dto.locale as PublicLanguage,
        policy.regionalLocale,
      );
      const key = await tx.localizationKey.findUnique({
        where: { key: dto.key },
      });
      if (!key || !key.isTenantEditable) {
        throw new ForbiddenException({
          code: 'LOCALIZATION_KEY_NOT_TENANT_EDITABLE',
          message: 'This wording cannot be overridden by a tenant',
        });
      }
      this.validateValue(key.defaultMessage, dto.value);
      const latest = await tx.tenantTranslationOverride.findFirst({
        where: { tenantId, locale, keyId: key.id },
        orderBy: { version: 'desc' },
      });
      const created = await tx.tenantTranslationOverride.create({
        data: {
          tenantId,
          locale,
          keyId: key.id,
          value: dto.value.trim(),
          reason: dto.reason.trim(),
          version: (latest?.version ?? 0) + 1,
        },
        include: { key: true },
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'workspace.localization.override.created',
        module: 'localization',
        entityType: 'TenantTranslationOverride',
        entityId: created.id,
        newValue: created,
      });
      return {
        ...created,
        locale: publicLanguageForLocale(created.locale),
      };
    });
  }

  updateOverride(id: string, dto: UpdateTenantTranslationOverrideDto) {
    return this.prisma.forTenant(async (tx) => {
      const tenantId = this.policies.requireTenantId();
      const current = await tx.tenantTranslationOverride.findFirst({
        where: { id, tenantId },
        include: { key: true },
      });
      if (!current) {
        throw new NotFoundException('Translation override not found');
      }
      if (current.status === LocalizationStatus.PUBLISHED) {
        throw new BadRequestException({
          code: 'LOCALIZATION_PUBLISHED_OVERRIDE_IMMUTABLE',
          message: 'Published overrides are immutable; create a new version',
        });
      }
      if (
        dto.status === LocalizationStatus.PUBLISHED &&
        current.status !== LocalizationStatus.REVIEW
      ) {
        throw new BadRequestException({
          code: 'LOCALIZATION_OVERRIDE_REVIEW_REQUIRED',
          message: 'A translation override must be reviewed before publishing',
        });
      }
      if (dto.value) this.validateValue(current.key.defaultMessage, dto.value);

      const updated = await tx.tenantTranslationOverride.update({
        where: { id },
        data: {
          value: dto.value?.trim(),
          reason: dto.reason?.trim(),
          status: dto.status,
          publishedAt:
            dto.status === LocalizationStatus.PUBLISHED
              ? new Date()
              : undefined,
          publishedBy:
            dto.status === LocalizationStatus.PUBLISHED
              ? this.tenantContext.userId
              : undefined,
        },
        include: { key: true },
      });
      if (dto.status === LocalizationStatus.PUBLISHED) {
        await tx.tenantLocalePolicy.update({
          where: { tenantId },
          data: { catalogVersion: { increment: 1 } },
        });
      }
      await this.audit.append(tx, {
        tenantId,
        action: `workspace.localization.override.${dto.status?.toLowerCase() ?? 'updated'}`,
        module: 'localization',
        entityType: 'TenantTranslationOverride',
        entityId: id,
        oldValue: current,
        newValue: updated,
      });
      return {
        ...updated,
        locale: publicLanguageForLocale(updated.locale),
      };
    });
  }

  private validateValue(source: string, value: string) {
    if (/<\/?[a-z][^>]*>/i.test(value)) {
      throw new BadRequestException({
        code: 'LOCALIZATION_HTML_NOT_ALLOWED',
        message: 'Translation values cannot contain HTML',
      });
    }
    const mismatch = assertMatchingPlaceholders(source, value);
    if (mismatch) {
      throw new BadRequestException({
        code: 'LOCALIZATION_PLACEHOLDER_MISMATCH',
        message: 'Translation placeholders must match the source message',
        details: mismatch,
      });
    }
  }
}

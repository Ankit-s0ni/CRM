import { ForbiddenException, Injectable } from '@nestjs/common';
import { TenantContextService } from '../../tenancy/public';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import {
  normalizeEnabledLanguages,
  publicLanguageForLocale,
  regionalLocaleForCountry,
  resolveCatalogLocale,
} from '../localization.constants';

@Injectable()
export class TenantLocalizationPolicyRepository {
  constructor(private readonly tenantContext: TenantContextService) {}

  requireTenantId() {
    const tenantId = this.tenantContext.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return tenantId;
  }

  async getOrCreate(tx: PrismaTransaction, tenantId: string) {
    const existing = await tx.tenantLocalePolicy.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;

    const office = await tx.officeLocation.findFirst({
      where: { tenantId, countryCode: { not: null } },
      select: { countryCode: true },
    });
    return tx.tenantLocalePolicy.create({
      data: {
        tenantId,
        defaultLocale: 'en',
        regionalLocale: regionalLocaleForCountry(office?.countryCode),
        enabledLocales: ['en', 'ar'],
      },
    });
  }

  toPublic(policy: {
    tenantId: string;
    defaultLocale: string;
    regionalLocale: string;
    regionalOverrideReason: string | null;
    enabledLocales: string[];
    allowUserPreference: boolean;
    allowTenantOverrides: boolean;
    catalogVersion: number;
    updatedBy: string | null;
    updatedAt: Date;
  }) {
    return {
      tenantId: policy.tenantId,
      defaultLanguage: publicLanguageForLocale(policy.defaultLocale),
      enabledLanguages: normalizeEnabledLanguages(policy.enabledLocales),
      allowUserPreference: policy.allowUserPreference,
      allowTenantOverrides: policy.allowTenantOverrides,
      regionalArabicLocale: resolveCatalogLocale('ar', policy.regionalLocale),
      regionalOverrideReason: policy.regionalOverrideReason,
      catalogVersion: policy.catalogVersion,
      updatedBy: policy.updatedBy,
      updatedAt: policy.updatedAt,
    };
  }
}

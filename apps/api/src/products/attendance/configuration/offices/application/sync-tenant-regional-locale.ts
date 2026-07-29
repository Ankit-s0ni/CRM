import type { PrismaTransaction } from '../../../../../shared/database/prisma.service';
import { regionalLocaleForCountry } from '../../../../../platform/localization/localization.constants';

export async function syncTenantRegionalLocale(
  tx: PrismaTransaction,
  tenantId: string,
) {
  const policy = await tx.tenantLocalePolicy.findUnique({
    where: { tenantId },
  });
  if (policy?.regionalOverrideReason) return;

  const offices = await tx.officeLocation.findMany({
    where: { tenantId, countryCode: { not: null } },
    distinct: ['countryCode'],
    select: { countryCode: true },
  });
  if (offices.length !== 1) return;

  const regionalLocale = regionalLocaleForCountry(offices[0].countryCode);
  if (!policy) {
    await tx.tenantLocalePolicy.create({
      data: {
        tenantId,
        defaultLocale: 'en',
        regionalLocale,
        enabledLocales: ['en', 'ar'],
      },
    });
    return;
  }
  if (policy.regionalLocale === regionalLocale) return;

  await tx.tenantLocalePolicy.update({
    where: { tenantId },
    data: {
      regionalLocale,
      catalogVersion: { increment: 1 },
    },
  });
}

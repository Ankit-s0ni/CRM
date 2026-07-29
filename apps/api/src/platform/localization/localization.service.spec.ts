import type { TenantContextService } from '../tenancy/public';
import type { PrismaService } from '../../shared/database/prisma.service';
import { LocalizationQueryService } from './application/services/localization-query.service';
import { TenantLocalizationPolicyRepository } from './infrastructure/tenant-localization-policy.repository';
import { LocalizationCatalogReader } from './infrastructure/localization-catalog.reader';

describe('LocalizationQueryService catalog isolation', () => {
  const key = {
    id: 'key-1',
    key: 'tenant.dashboard.header.title',
    namespace: 'tenant-dashboard',
    defaultMessage: 'HR operations',
  };
  const basePack = {
    locale: 'ar',
    version: 2,
    translations: [
      {
        keyId: key.id,
        value: 'عمليات الموارد البشرية',
      },
    ],
  };

  function serviceFor(
    tenantId: string,
    options: {
      defaultLocale?: string;
      regionalLocale?: string;
      enabledLocales?: string[];
      allowTenantOverrides?: boolean;
      packs?: (typeof basePack)[];
    } = {},
  ) {
    const tx = {
      tenantLocalePolicy: {
        findUnique: jest.fn().mockResolvedValue({
          tenantId,
          defaultLocale: options.defaultLocale ?? 'ar',
          regionalLocale: options.regionalLocale ?? 'ar-OM',
          enabledLocales: options.enabledLocales ?? ['en', 'ar'],
          allowTenantOverrides: options.allowTenantOverrides ?? true,
          allowUserPreference: false,
          catalogVersion: 3,
        }),
      },
      localizationKey: {
        findMany: jest.fn().mockResolvedValue([key]),
      },
      localePack: {
        findMany: jest.fn().mockResolvedValue(options.packs ?? [basePack]),
      },
      tenantTranslationOverride: {
        findMany: jest.fn(({ where }: { where: { tenantId: string } }) =>
          Promise.resolve(
            where.tenantId === 'tenant-a'
              ? [
                  {
                    key,
                    value: 'عمليات فريق ألف',
                    version: 1,
                  },
                ]
              : [],
          ),
        ),
      },
    };
    const prisma = {
      forTenant: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as unknown as PrismaService;
    const tenantContext = { tenantId } as TenantContextService;
    return new LocalizationQueryService(
      prisma,
      new TenantLocalizationPolicyRepository(tenantContext),
      new LocalizationCatalogReader(),
    );
  }

  it('applies a published override only to its owning tenant', async () => {
    const tenantA = await serviceFor('tenant-a').catalog('ar', [
      'tenant-dashboard',
    ]);
    const tenantB = await serviceFor('tenant-b').catalog('ar', [
      'tenant-dashboard',
    ]);

    expect(tenantA.language).toBe('ar');
    expect(tenantA.resolvedLocale).toBe('ar-OM');
    expect(tenantA.messages[key.key]).toBe('عمليات فريق ألف');
    expect(tenantB.messages[key.key]).toBe('عمليات الموارد البشرية');
    expect(tenantA.etag).not.toBe(tenantB.etag);
  });

  it.each([
    ['Oman', 'ar-OM'],
    ['UAE', 'ar-AE'],
    ['generic Arabic', 'ar'],
  ])('resolves Arabic for a %s tenant', async (_market, regionalLocale) => {
    const catalog = await serviceFor('tenant-a', {
      regionalLocale,
      allowTenantOverrides: false,
    }).catalog('ar');

    expect(catalog.language).toBe('ar');
    expect(catalog.resolvedLocale).toBe(regionalLocale);
    expect(catalog.direction).toBe('rtl');
  });

  it.each([
    {
      label: 'English-only',
      defaultLocale: 'en',
      enabledLocales: ['en'],
      requested: 'ar',
      expected: 'en',
    },
    {
      label: 'Arabic-only',
      defaultLocale: 'ar',
      enabledLocales: ['ar'],
      requested: 'en',
      expected: 'ar',
    },
    {
      label: 'bilingual',
      defaultLocale: 'en',
      enabledLocales: ['en', 'ar'],
      requested: 'ar',
      expected: 'ar',
    },
    {
      label: 'legacy bilingual',
      defaultLocale: 'en',
      enabledLocales: ['en', 'ar-OM'],
      requested: 'ar',
      expected: 'ar',
    },
  ])(
    'enforces the $label public language policy',
    async ({ defaultLocale, enabledLocales, requested, expected }) => {
      const catalog = await serviceFor('tenant-a', {
        defaultLocale,
        enabledLocales,
        allowTenantOverrides: false,
      }).catalog(requested);

      expect(catalog.language).toBe(expected);
    },
  );

  it('applies English, Arabic, then regional Arabic fallback precedence', async () => {
    const packs = [
      {
        locale: 'en',
        version: 1,
        translations: [{ keyId: key.id, value: 'English pack' }],
      },
      {
        locale: 'ar',
        version: 2,
        translations: [{ keyId: key.id, value: 'Arabic pack' }],
      },
      {
        locale: 'ar-OM',
        version: 3,
        translations: [{ keyId: key.id, value: 'Oman pack' }],
      },
    ];
    const catalog = await serviceFor('tenant-a', {
      regionalLocale: 'ar-OM',
      allowTenantOverrides: false,
      packs,
    }).catalog('ar');

    expect(catalog.messages[key.key]).toBe('Oman pack');
    expect(catalog.version).toBe(3);
  });
});

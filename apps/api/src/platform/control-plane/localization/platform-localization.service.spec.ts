import { LocalizationStatus, PlatformRole } from '@prisma/client';
import type { PlatformDatabaseService } from '../../../shared/database/platform-database.service';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import { PlatformLocalizationService } from './platform-localization.service';

describe('PlatformLocalizationService release governance', () => {
  const actor: AuthenticatedPlatformUser = {
    platformUserId: 'platform-user-1',
    email: 'owner@example.com',
    role: PlatformRole.SUPER_ADMIN,
    sessionId: 'session-1',
    permissions: [],
    mfaVerifiedAt: new Date().toISOString(),
  };

  function serviceWith(tx: Record<string, unknown>) {
    const database = {
      transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as unknown as PlatformDatabaseService;
    return new PlatformLocalizationService(database);
  }

  it('reports inherited base Arabic as effective regional coverage', async () => {
    const now = new Date();
    const packs = [
      pack('ar', [{ keyId: 'required-1' }], now),
      pack('ar-OM', [], now),
      pack('en', [], now),
    ];
    const tx = {
      localizationKey: {
        findMany: jest.fn().mockResolvedValue([{ id: 'required-1' }]),
      },
      localePack: { findMany: jest.fn().mockResolvedValue(packs) },
      tenantLocalePolicy: { count: jest.fn().mockResolvedValue(0) },
    };

    const response = await serviceWith(tx).listPacks();
    const oman = response.data.find(({ locale }) => locale === 'ar-OM');

    expect(oman).toMatchObject({
      coverage: 100,
      translatedKeys: 0,
      effectiveTranslatedKeys: 1,
      requiredKeys: 1,
    });
  });

  it('does not publish a pack that has not entered review', async () => {
    const tx = {
      localePack: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    await expect(
      serviceWith(tx).publishPack('ar-AE', actor, {}),
    ).rejects.toMatchObject({ status: 404 });
    expect(tx.localePack.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { locale: 'ar-AE', status: LocalizationStatus.REVIEW },
      }),
    );
  });

  it('publishes a reviewed pack, invalidates tenant catalogs and audits it', async () => {
    const reviewed = {
      ...pack('ar-AE', [{ keyId: 'key-1', status: LocalizationStatus.REVIEW }]),
      id: 'pack-2',
      version: 2,
      status: LocalizationStatus.REVIEW,
    };
    const published = {
      ...reviewed,
      status: LocalizationStatus.PUBLISHED,
    };
    let audited: unknown;
    const auditCreate = jest.fn((input: unknown) => {
      audited = input;
      return Promise.resolve({});
    });
    const tx = {
      localePack: {
        findFirst: jest.fn().mockResolvedValue(reviewed),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue(published),
      },
      localeTranslation: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      tenantLocalePolicy: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      systemAuditLog: { create: auditCreate },
    };

    const response = await serviceWith(tx).publishPack('ar-AE', actor, {
      requestId: 'request-1',
    });

    expect(response.data.status).toBe(LocalizationStatus.PUBLISHED);
    expect(tx.tenantLocalePolicy.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { catalogVersion: { increment: 1 } },
      }),
    );
    expect(audited).toMatchObject({
      data: {
        action: 'platform.localization.pack.published',
        requestId: 'request-1',
      },
    });
  });

  it('rolls back only to an archived version and records the release change', async () => {
    const archived = {
      ...pack('ar-OM'),
      id: 'pack-1',
      version: 1,
      status: LocalizationStatus.ARCHIVED,
    };
    let audited: unknown;
    const auditCreate = jest.fn((input: unknown) => {
      audited = input;
      return Promise.resolve({});
    });
    const tx = {
      localePack: {
        findUnique: jest.fn().mockResolvedValue(archived),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({
          ...archived,
          status: LocalizationStatus.PUBLISHED,
        }),
      },
      tenantLocalePolicy: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      systemAuditLog: { create: auditCreate },
    };

    const response = await serviceWith(tx).rollbackPack('ar-OM', 1, actor, {});

    expect(response.data.status).toBe(LocalizationStatus.PUBLISHED);
    expect(audited).toMatchObject({
      data: {
        action: 'platform.localization.pack.rolled_back',
      },
    });
  });

  it('archives a non-active release and its translations', async () => {
    const draft = {
      ...pack('ar-OM'),
      id: 'pack-2',
      version: 2,
      status: LocalizationStatus.DRAFT,
    };
    let audited: unknown;
    const auditCreate = jest.fn((input: unknown) => {
      audited = input;
      return Promise.resolve({});
    });
    const tx = {
      localePack: {
        findUnique: jest.fn().mockResolvedValue(draft),
        update: jest.fn().mockResolvedValue({
          ...draft,
          status: LocalizationStatus.ARCHIVED,
        }),
      },
      localeTranslation: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      systemAuditLog: { create: auditCreate },
    };

    const response = await serviceWith(tx).archivePack('ar-OM', 2, actor, {});

    expect(response.data.status).toBe(LocalizationStatus.ARCHIVED);
    expect(tx.localeTranslation.updateMany).toHaveBeenCalledWith({
      where: { localePackId: 'pack-2' },
      data: { status: LocalizationStatus.ARCHIVED },
    });
    expect(audited).toMatchObject({
      data: {
        action: 'platform.localization.pack.archived',
      },
    });
  });
});

function pack(
  locale: string,
  translations: Array<{ keyId: string; status?: LocalizationStatus }> = [],
  now = new Date(),
) {
  return {
    id: `pack-${locale}`,
    locale,
    parentLocale: locale === 'ar' ? 'en' : locale === 'en' ? null : 'ar',
    displayName: locale,
    nativeName: locale,
    direction: locale === 'en' ? 'LTR' : 'RTL',
    status: LocalizationStatus.PUBLISHED,
    version: 1,
    publishedAt: now,
    publishedBy: null,
    createdAt: now,
    updatedAt: now,
    translations,
    _count: { translations: translations.length },
  };
}

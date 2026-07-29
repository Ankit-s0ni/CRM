import { syncTenantRegionalLocale } from './sync-tenant-regional-locale';

describe('syncTenantRegionalLocale', () => {
  it.each([
    ['OM', 'ar-OM'],
    ['AE', 'ar-AE'],
  ])(
    'creates the %s regional policy from the office country',
    async (countryCode, regionalLocale) => {
      const create = jest.fn().mockResolvedValue(undefined);
      const tx = {
        tenantLocalePolicy: {
          findUnique: jest.fn().mockResolvedValue(null),
          create,
        },
        officeLocation: {
          findMany: jest.fn().mockResolvedValue([{ countryCode }]),
        },
      };

      await syncTenantRegionalLocale(tx as never, 'tenant-1');

      expect(create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          defaultLocale: 'en',
          regionalLocale,
          enabledLocales: ['en', 'ar'],
        },
      });
    },
  );

  it('preserves an explicit platform regional override', async () => {
    const findMany = jest.fn();
    const update = jest.fn();
    const tx = {
      tenantLocalePolicy: {
        findUnique: jest.fn().mockResolvedValue({
          regionalOverrideReason: 'Approved business terminology',
        }),
        update,
      },
      officeLocation: { findMany },
    };

    await syncTenantRegionalLocale(tx as never, 'tenant-1');

    expect(findMany).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('changes only the internal regional pack for an existing policy', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const tx = {
      tenantLocalePolicy: {
        findUnique: jest.fn().mockResolvedValue({
          defaultLocale: 'ar',
          regionalLocale: 'ar-OM',
          enabledLocales: ['en', 'ar'],
          regionalOverrideReason: null,
        }),
        update,
      },
      officeLocation: {
        findMany: jest.fn().mockResolvedValue([{ countryCode: 'AE' }]),
      },
    };

    await syncTenantRegionalLocale(tx as never, 'tenant-1');

    expect(update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      data: {
        regionalLocale: 'ar-AE',
        catalogVersion: { increment: 1 },
      },
    });
  });

  it('does not guess a locale for a tenant spanning multiple countries', async () => {
    const update = jest.fn();
    const tx = {
      tenantLocalePolicy: {
        findUnique: jest.fn().mockResolvedValue({
          regionalOverrideReason: null,
        }),
        update,
      },
      officeLocation: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ countryCode: 'OM' }, { countryCode: 'AE' }]),
      },
    };

    await syncTenantRegionalLocale(tx as never, 'tenant-1');

    expect(update).not.toHaveBeenCalled();
  });
});

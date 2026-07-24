import { PublicHolidaySyncService } from './public-holiday-sync.service';

describe('PublicHolidaySyncService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('imports embedded public holidays for a supported office country', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 6 });
    const append = jest.fn().mockResolvedValue(undefined);
    const tx = {
      officeLocation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'office-1',
            officeName: 'Bengaluru',
            countryCode: 'IN',
            subdivisionCode: 'IN-KA',
          },
        ]),
      },
      tenantHoliday: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany,
      },
    };
    const prisma = {
      forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new PublicHolidaySyncService(
      prisma as never,
      { append } as never,
    );

    const result = await service.sync('tenant-1', 'user-1', {
      officeLocationId: 'office-1',
      year: 2026,
    });

    expect(result.data.results[0]).toMatchObject({
      status: 'SYNCED',
      provider: 'date-holidays',
      countryCode: 'IN',
    });
    expect(result.data.results[0]?.imported).toBeGreaterThan(0);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(1);
  });

  it('imports Oman holidays from the official Ministry of Labour feed', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            {
              date: '2026-11-25T00:00:00.000Z',
              name_i18n: { en_US: 'National Day Holiday' },
            },
          ],
        }),
    } as Response);
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      officeLocation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'office-2',
            officeName: 'Muscat',
            countryCode: 'OM',
            subdivisionCode: null,
          },
        ]),
      },
      tenantHoliday: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany,
      },
    };
    const prisma = {
      forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new PublicHolidaySyncService(
      prisma as never,
      { append: jest.fn() } as never,
    );

    const result = await service.sync('tenant-1', 'user-1', {
      officeLocationId: 'office-2',
      year: 2026,
    });

    expect(result.data.results[0]).toMatchObject({
      status: 'SYNCED',
      provider: 'Oman Ministry of Labour',
      countryCode: 'OM',
      imported: 1,
    });
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            holidayName: 'National Day Holiday',
            sourceProvider: 'Oman Ministry of Labour',
          }),
        ],
      }),
    );
  });

  it('uses the no-key fallback when the embedded dataset is unavailable', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            holidays: [
              {
                name: 'National Day',
                date: '2026-11-18',
                observed_date: '2026-11-18',
                type: 'national',
              },
            ],
          }),
      } as Response);
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      officeLocation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'office-2',
            officeName: 'Muscat',
            countryCode: 'OM',
            subdivisionCode: null,
          },
        ]),
      },
      tenantHoliday: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany,
      },
    };
    const prisma = {
      forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new PublicHolidaySyncService(
      prisma as never,
      { append: jest.fn() } as never,
    );

    const result = await service.sync('tenant-1', 'user-1', {
      officeLocationId: 'office-2',
      year: 2026,
    });

    expect(result.data.results[0]).toMatchObject({
      status: 'SYNCED',
      provider: 'Tallyfy',
      countryCode: 'OM',
      imported: 1,
    });
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            holidayName: 'National Day',
            sourceProvider: 'Tallyfy',
          }),
        ],
      }),
    );
  });
});

import { BadRequestException } from '@nestjs/common';
import { LocationSearchService } from './location-search.service';

describe('LocationSearchService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('normalizes Photon features for the office location combobox', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { coordinates: [58.4059, 23.588] },
            properties: {
              osm_type: 'W',
              osm_id: 42,
              name: 'Muscat Grand Mall',
              city: 'Muscat',
              country: 'Oman',
              countrycode: 'om',
            },
          },
        ],
      }),
    }) as typeof fetch;

    const result = await new LocationSearchService().search('Muscat', 20);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'W-42',
        latitude: 23.588,
        longitude: 58.4059,
        name: 'Muscat Grand Mall',
        countryCode: 'OM',
      }),
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=8'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('rejects incomplete autocomplete queries before calling the provider', async () => {
    global.fetch = jest.fn() as typeof fetch;

    await expect(new LocationSearchService().search('Mu')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

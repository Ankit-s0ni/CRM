import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
  };
};

type PhotonResponse = { features?: PhotonFeature[] };

@Injectable()
export class LocationSearchService {
  async search(query: string, requestedLimit?: number) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3 || normalizedQuery.length > 160) {
      throw new BadRequestException(
        'Location search must contain between 3 and 160 characters',
      );
    }

    const validRequestedLimit = Number.isFinite(requestedLimit)
      ? requestedLimit
      : 6;
    const limit = Math.min(Math.max(validRequestedLimit ?? 6, 1), 8);
    const params = new URLSearchParams({
      q: normalizedQuery,
      limit: String(limit),
    });
    const baseUrl =
      process.env.PHOTON_GEOCODING_URL ?? 'https://photon.komoot.io/api/';

    try {
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            process.env.GEOCODING_USER_AGENT ??
            'DeltCRM location search (https://blufield.cloud)',
        },
        signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) {
        throw new Error(`Photon returned ${response.status}`);
      }

      const result = (await response.json()) as PhotonResponse;
      return (result.features ?? []).flatMap((feature, index) => {
        const [longitude, latitude] = feature.geometry?.coordinates ?? [];
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

        const properties = feature.properties ?? {};
        return [
          {
            id: `${properties.osm_type ?? 'place'}-${properties.osm_id ?? index}`,
            latitude,
            longitude,
            name: properties.name ?? null,
            houseNumber: properties.housenumber ?? null,
            street: properties.street ?? null,
            district: properties.district ?? null,
            city: properties.city ?? null,
            county: properties.county ?? null,
            state: properties.state ?? null,
            postcode: properties.postcode ?? null,
            country: properties.country ?? null,
            countryCode: properties.countrycode?.toUpperCase() ?? null,
          },
        ];
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException(
        'Location suggestions are temporarily unavailable',
      );
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { HolidaySource } from '@prisma/client';
import Holidays from 'date-holidays';
import { AuditService } from '../../../../platform/audit/public';
import { PrismaService } from '../../../../shared/database/prisma.service';

type PublicHoliday = {
  date: string;
  name: string;
};

type ProviderResult = {
  holidays: PublicHoliday[];
  provider: 'Oman Ministry of Labour' | 'date-holidays' | 'Tallyfy';
  attributionUrl: string;
};

export type HolidaySyncResult = {
  officeId: string;
  officeName: string;
  countryCode: string | null;
  subdivisionCode: string | null;
  imported: number;
  skipped: number;
  provider: string | null;
  status: 'SYNCED' | 'REGION_REQUIRED' | 'PROVIDER_UNAVAILABLE';
  message?: string;
};

@Injectable()
export class PublicHolidaySyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async sync(
    tenantId: string,
    actorUserId: string,
    options: { officeLocationId?: string; year?: number } = {},
  ) {
    const offices = await this.prisma.forTenant((tx) =>
      tx.officeLocation.findMany({
        where: {
          tenantId,
          ...(options.officeLocationId ? { id: options.officeLocationId } : {}),
        },
        orderBy: { officeName: 'asc' },
      }),
    );
    if (options.officeLocationId && !offices.length) {
      throw new NotFoundException('Office not found');
    }

    const startYear = options.year ?? new Date().getUTCFullYear();
    const years = options.year ? [startYear] : [startYear, startYear + 1];
    const results: HolidaySyncResult[] = [];

    for (const office of offices) {
      if (!office.countryCode) {
        results.push({
          officeId: office.id,
          officeName: office.officeName,
          countryCode: null,
          subdivisionCode: office.subdivisionCode,
          imported: 0,
          skipped: 0,
          provider: null,
          status: 'REGION_REQUIRED',
          message: 'Select the office country before syncing public holidays.',
        });
        continue;
      }

      const providerResults = await Promise.all(
        years.map((year) =>
          this.loadProviderHolidays(
            office.countryCode!,
            office.subdivisionCode,
            year,
          ),
        ),
      );
      const available = providerResults.filter(
        (result): result is ProviderResult => result !== null,
      );
      if (!available.length) {
        results.push({
          officeId: office.id,
          officeName: office.officeName,
          countryCode: office.countryCode,
          subdivisionCode: office.subdivisionCode,
          imported: 0,
          skipped: 0,
          provider: null,
          status: 'PROVIDER_UNAVAILABLE',
          message:
            'Automatic holiday data is unavailable for this country. Add holidays manually.',
        });
        continue;
      }

      const byDate = new Map<string, PublicHoliday>();
      for (const result of available) {
        for (const holiday of result.holidays) {
          if (!byDate.has(holiday.date)) byDate.set(holiday.date, holiday);
        }
      }
      const provider = available[0].provider;
      const dates = [...byDate.keys()].map(
        (date) => new Date(`${date}T00:00:00.000Z`),
      );

      const imported = await this.prisma.forTenant(async (tx) => {
        const existing = await tx.tenantHoliday.findMany({
          where: {
            tenantId,
            officeLocationId: office.id,
            holidayDate: { in: dates },
          },
          select: { holidayDate: true },
        });
        const existingDates = new Set(
          existing.map(({ holidayDate }) =>
            holidayDate.toISOString().slice(0, 10),
          ),
        );
        const missing = [...byDate.entries()].filter(
          ([date]) => !existingDates.has(date),
        );
        if (missing.length) {
          await tx.tenantHoliday.createMany({
            data: missing.map(([date, holiday]) => ({
              tenantId,
              officeLocationId: office.id,
              holidayDate: new Date(`${date}T00:00:00.000Z`),
              holidayName: holiday.name,
              source: HolidaySource.PUBLIC_DATA,
              sourceProvider: provider,
            })),
            skipDuplicates: true,
          });
        }
        await this.audit.append(tx, {
          tenantId,
          actorUserId,
          action: 'attendance.holidays.public_data_synced',
          module: 'attendance',
          entityType: 'OfficeLocation',
          entityId: office.id,
          newValue: {
            countryCode: office.countryCode,
            subdivisionCode: office.subdivisionCode,
            years,
            provider,
            imported: missing.length,
            skipped: existingDates.size,
          },
        });
        return missing.length;
      });

      results.push({
        officeId: office.id,
        officeName: office.officeName,
        countryCode: office.countryCode,
        subdivisionCode: office.subdivisionCode,
        imported,
        skipped: byDate.size - imported,
        provider,
        status: 'SYNCED',
      });
    }

    return {
      data: {
        results,
        years,
        attribution: availableAttribution(results),
      },
    };
  }

  private async loadProviderHolidays(
    countryCode: string,
    subdivisionCode: string | null,
    year: number,
  ): Promise<ProviderResult | null> {
    const normalizedCountry = countryCode.toUpperCase();
    if (normalizedCountry === 'OM') {
      const officialHolidays = await this.loadOmanGovernmentHolidays(year);
      if (officialHolidays) return officialHolidays;
    }

    try {
      const state = subdivisionCode?.split('-')[1];
      const calendar = state
        ? new Holidays(normalizedCountry, state, { types: ['public'] })
        : new Holidays(normalizedCountry, { types: ['public'] });
      const holidays = calendar
        .getHolidays(year, 'en')
        .filter(({ type }) => type === 'public')
        .map(({ date, name }) => ({ date: date.slice(0, 10), name }));
      if (holidays.length) {
        return {
          holidays,
          provider: 'date-holidays',
          attributionUrl: 'https://github.com/commenthol/date-holidays',
        };
      }
    } catch {
      // Try the broad no-auth provider when the embedded dataset has no country.
    }

    return this.loadTallyfyHolidays(normalizedCountry, year);
  }

  private async loadOmanGovernmentHolidays(
    year: number,
  ): Promise<ProviderResult | null> {
    try {
      const url = new URL('https://gov.om/o/c/events/scopes/20117');
      url.searchParams.set('restrictFields', 'actions,creator');
      url.searchParams.set('pageSize', '-1');
      url.searchParams.set(
        'filter',
        `(date ge ${year}-01-01 and date le ${year}-12-31) and status in (0) and (type eq 'holiday') and (taxonomyCategoryIds/any(t:t eq 400196))`,
      );
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return null;

      const payload = (await response.json()) as {
        items?: Array<{
          date?: string;
          name_i18n?: { en_US?: string };
          name?: string;
        }>;
      };
      const holidays = (payload.items ?? []).flatMap((holiday) => {
        const date = holiday.date?.slice(0, 10);
        const name = holiday.name_i18n?.en_US ?? holiday.name;
        return date && name ? [{ date, name }] : [];
      });
      return holidays.length
        ? {
            holidays,
            provider: 'Oman Ministry of Labour',
            attributionUrl:
              'https://gov.om/en/important-dates-and-holidays?entity=400196',
          }
        : null;
    } catch {
      return null;
    }
  }

  private async loadTallyfyHolidays(
    countryCode: string,
    year: number,
  ): Promise<ProviderResult | null> {
    try {
      const response = await fetch(
        `https://tallyfy.com/national-holidays/api/${encodeURIComponent(countryCode)}/${year}.json`,
        {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!response.ok) return null;

      const payload = (await response.json()) as {
        holidays?: Array<{
          date?: string;
          observed_date?: string;
          name?: string;
          type?: string;
        }>;
      };
      const holidays = (payload.holidays ?? []).flatMap((holiday) => {
        const date = holiday.observed_date ?? holiday.date;
        return holiday.name && date && holiday.type === 'national'
          ? [{ date: date.slice(0, 10), name: holiday.name }]
          : [];
      });
      return holidays.length
        ? {
            holidays,
            provider: 'Tallyfy',
            attributionUrl: 'https://tallyfy.com/national-holidays/',
          }
        : null;
    } catch {
      return null;
    }
  }
}

function availableAttribution(results: HolidaySyncResult[]) {
  const providers = new Set(
    results.flatMap(({ provider }) => (provider ? [provider] : [])),
  );
  return [...providers].map((provider) => ({
    provider,
    url: providerAttributionUrl(provider),
  }));
}

function providerAttributionUrl(provider: string) {
  if (provider === 'Oman Ministry of Labour') {
    return 'https://gov.om/en/important-dates-and-holidays?entity=400196';
  }
  if (provider === 'Tallyfy') {
    return 'https://tallyfy.com/national-holidays/';
  }
  return 'https://github.com/commenthol/date-holidays';
}

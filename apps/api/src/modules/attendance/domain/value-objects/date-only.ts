import { DateTime } from 'luxon';

export class DateOnly {
  private constructor(readonly value: string) {}

  static parse(value: string) {
    const parsed = DateTime.fromISO(value, { zone: 'utc' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !parsed.isValid) {
      throw new Error('DATE_ONLY_INVALID');
    }
    return new DateOnly(value);
  }

  static fromInstant(instant: Date, timezone: string) {
    const value = DateTime.fromJSDate(instant, { zone: timezone });
    if (!value.isValid) throw new Error('TIMEZONE_INVALID');
    return new DateOnly(value.toISODate());
  }

  plusDays(days: number) {
    return new DateOnly(
      DateTime.fromISO(this.value, { zone: 'utc' }).plus({ days }).toISODate()!,
    );
  }

  toDatabaseDate() {
    return new Date(`${this.value}T00:00:00.000Z`);
  }
}

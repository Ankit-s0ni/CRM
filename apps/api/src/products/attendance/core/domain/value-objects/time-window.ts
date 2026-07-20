import { DateTime, Interval } from 'luxon';
import { DateOnly } from './date-only';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class TimeWindow {
  private constructor(
    readonly startTime: string,
    readonly endTime: string,
    readonly overnight: boolean,
  ) {}

  static create(startTime: string, endTime: string) {
    if (
      !TIME_PATTERN.test(startTime) ||
      !TIME_PATTERN.test(endTime) ||
      startTime === endTime
    ) {
      throw new Error('TIME_WINDOW_INVALID');
    }
    return new TimeWindow(startTime, endTime, endTime < startTime);
  }

  bounds(date: DateOnly, timezone: string) {
    const start = localDateTime(date.value, this.startTime, timezone);
    const endDate = this.overnight ? date.plusDays(1).value : date.value;
    const end = localDateTime(endDate, this.endTime, timezone);
    return { start, end, interval: Interval.fromDateTimes(start, end) };
  }
}

export function localDateTime(date: string, time: string, timezone: string) {
  const value = DateTime.fromISO(`${date}T${time}:00`, { zone: timezone });
  if (!value.isValid) throw new Error('LOCAL_DATE_TIME_INVALID');
  return value;
}

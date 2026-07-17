import { DateTime } from 'luxon';
import { DateOnly } from './value-objects/date-only';
import { TimeWindow } from './value-objects/time-window';

export type ShiftForAttribution = {
  startTime: string;
  endTime: string;
  timezone: string;
};

export function attributeAttendanceDate(
  instant: Date,
  timezone: string,
  shift?: ShiftForAttribution | null,
) {
  const localDate = DateOnly.fromInstant(instant, timezone);
  if (!shift) return localDate;

  const window = TimeWindow.create(shift.startTime, shift.endTime);
  if (!window.overnight) return localDate;

  const shiftTimezone = shift.timezone || timezone;
  const local = DateTime.fromJSDate(instant, { zone: shiftTimezone });
  const previousDate = DateOnly.parse(local.toISODate()!).plusDays(-1);
  const previousBounds = window.bounds(previousDate, shiftTimezone);
  return previousBounds.interval.contains(local) ||
    local.toMillis() === previousBounds.end.toMillis()
    ? previousDate
    : DateOnly.parse(local.toISODate()!);
}

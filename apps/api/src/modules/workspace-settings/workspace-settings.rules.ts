import { UnprocessableEntityException } from '@nestjs/common';

const WEEKDAYS = new Set(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);

export type WeeklyOffPattern = {
  weekday: string;
  occurrences?: number[];
};

export function assertTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new UnprocessableEntityException({
      code: 'INVALID_TIMEZONE',
      message: 'Timezone must be a valid IANA timezone name',
    });
  }
}

export function normalizeWeeklyOffs(value: unknown): WeeklyOffPattern[] {
  const input = Array.isArray(value) ? value : [];
  const patterns = input.map((item) => {
    if (typeof item === 'string') return { weekday: item.toUpperCase() };
    if (!item || typeof item !== 'object') return invalidWeeklyOffs();
    const candidate = item as { weekday?: unknown; occurrences?: unknown };
    if (typeof candidate.weekday !== 'string') return invalidWeeklyOffs();
    const weekday = candidate.weekday.toUpperCase();
    const occurrences = candidate.occurrences;
    if (
      occurrences !== undefined &&
      (!Array.isArray(occurrences) ||
        occurrences.length === 0 ||
        occurrences.some(
          (occurrence) =>
            !Number.isInteger(occurrence) || occurrence < 1 || occurrence > 5,
        ))
    ) {
      return invalidWeeklyOffs();
    }
    return {
      weekday,
      ...(occurrences
        ? { occurrences: [...new Set(occurrences as number[])].sort() }
        : {}),
    };
  });

  if (
    patterns.length > 7 ||
    patterns.some(({ weekday }) => !WEEKDAYS.has(weekday)) ||
    new Set(patterns.map(({ weekday }) => weekday)).size !== patterns.length
  ) {
    return invalidWeeklyOffs();
  }
  return patterns;
}

export function assertClockTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new UnprocessableEntityException({
      code: 'SETTINGS_TIME_INVALID',
      message: 'Times must use 24-hour HH:mm format',
    });
  }
}

function invalidWeeklyOffs(): never {
  throw new UnprocessableEntityException({
    code: 'WEEKLY_OFF_PATTERN_INVALID',
    message:
      'Weekly offs must contain unique weekdays and optional occurrences from 1 to 5',
  });
}

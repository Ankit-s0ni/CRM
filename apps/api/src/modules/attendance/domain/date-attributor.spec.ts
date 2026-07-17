import { attributeAttendanceDate } from './date-attributor';

describe('attributeAttendanceDate', () => {
  const cases = [
    ['2026-07-17T18:00:00.000Z', 'Asia/Muscat', '22:00', '06:00', '2026-07-17'],
    ['2026-07-17T20:00:00.000Z', 'Asia/Muscat', '22:00', '06:00', '2026-07-17'],
    ['2026-07-18T00:00:00.000Z', 'Asia/Muscat', '22:00', '06:00', '2026-07-17'],
    ['2026-07-18T01:59:00.000Z', 'Asia/Muscat', '22:00', '06:00', '2026-07-17'],
    ['2026-07-18T02:01:00.000Z', 'Asia/Muscat', '22:00', '06:00', '2026-07-18'],
    [
      '2026-07-17T05:00:00.000Z',
      'Asia/Kolkata',
      '09:00',
      '18:00',
      '2026-07-17',
    ],
    [
      '2026-03-08T07:30:00.000Z',
      'America/New_York',
      '22:00',
      '06:00',
      '2026-03-07',
    ],
    [
      '2026-11-01T05:30:00.000Z',
      'America/New_York',
      '22:00',
      '06:00',
      '2026-10-31',
    ],
  ] as const;

  it.each(cases)(
    'attributes %s in %s to %s',
    (instant, timezone, startTime, endTime, expected) => {
      expect(
        attributeAttendanceDate(new Date(instant), timezone, {
          startTime,
          endTime,
          timezone,
        }).value,
      ).toBe(expected);
    },
  );
});

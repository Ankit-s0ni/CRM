import {
  assertClockTime,
  assertTimezone,
  normalizeWeeklyOffs,
} from './workspace-settings.rules';

describe('workspace settings rules', () => {
  it('accepts IANA timezones and rejects unknown zones', () => {
    expect(() => assertTimezone('Asia/Kolkata')).not.toThrow();
    expect(() => assertTimezone('Mumbai/Office')).toThrow('Timezone must be');
  });

  it('normalizes second and fourth Saturday patterns', () => {
    expect(
      normalizeWeeklyOffs([{ weekday: 'sat', occurrences: [4, 2] }, 'sun']),
    ).toEqual([{ weekday: 'SAT', occurrences: [2, 4] }, { weekday: 'SUN' }]);
  });

  it('accepts Gulf weekend patterns and occurrence rules on any weekday', () => {
    expect(normalizeWeeklyOffs(['fri', 'sat'])).toEqual([
      { weekday: 'FRI' },
      { weekday: 'SAT' },
    ]);
    expect(
      normalizeWeeklyOffs([{ weekday: 'fri', occurrences: [5, 1, 3] }]),
    ).toEqual([{ weekday: 'FRI', occurrences: [1, 3, 5] }]);
  });

  it('rejects malformed weekly offs and clock times', () => {
    expect(() =>
      normalizeWeeklyOffs([{ weekday: 'SAT', occurrences: [0] }]),
    ).toThrow();
    expect(() => assertClockTime('24:00')).toThrow();
  });
});

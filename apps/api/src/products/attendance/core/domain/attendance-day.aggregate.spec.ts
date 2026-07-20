import {
  AttendanceDay,
  AttendanceTransitionError,
} from './attendance-day.aggregate';
import { AttendanceEventKind } from './attendance-types';

describe('AttendanceDay aggregate', () => {
  const validTransitions: Array<{
    events: AttendanceEventKind[];
    state: string;
  }> = [
    { events: [], state: 'CLOSED' },
    { events: ['CHECKIN'], state: 'OPEN' },
    { events: ['CHECKIN', 'BREAK_START'], state: 'ON_BREAK' },
    { events: ['CHECKIN', 'BREAK_START', 'BREAK_END'], state: 'OPEN' },
    { events: ['CHECKIN', 'CHECKOUT'], state: 'CLOSED' },
    {
      events: ['CHECKIN', 'CHECKOUT', 'CHECKIN', 'CHECKOUT'],
      state: 'CLOSED',
    },
    {
      events: ['REGULARIZED_CHECKIN', 'REGULARIZED_CHECKOUT'],
      state: 'CLOSED',
    },
  ];

  it.each(validTransitions)(
    'restores $events to $state',
    ({ events, state }) => {
      expect(AttendanceDay.restore(events.map(event)).currentState).toBe(state);
    },
  );

  const invalidTransitions: Array<{
    existing: AttendanceEventKind[];
    next: AttendanceEventKind;
    code: string;
  }> = [
    { existing: ['CHECKIN'], next: 'CHECKIN', code: 'ATTENDANCE_ALREADY_OPEN' },
    { existing: [], next: 'CHECKOUT', code: 'ATTENDANCE_NOT_OPEN' },
    { existing: [], next: 'BREAK_START', code: 'ATTENDANCE_NOT_OPEN' },
    { existing: [], next: 'BREAK_END', code: 'BREAK_NOT_OPEN' },
    {
      existing: ['CHECKIN', 'BREAK_START'],
      next: 'BREAK_START',
      code: 'BREAK_ALREADY_OPEN',
    },
    {
      existing: ['CHECKIN'],
      next: 'BREAK_END',
      code: 'BREAK_NOT_OPEN',
    },
    {
      existing: ['CHECKIN', 'BREAK_START'],
      next: 'CHECKOUT',
      code: 'BREAK_ALREADY_OPEN',
    },
  ];

  it.each(invalidTransitions)(
    'rejects $next after $existing with $code',
    ({ existing, next, code }) => {
      const day = AttendanceDay.restore(existing.map(event));
      expect(() => day.assertCanAppend(next)).toThrow(
        new AttendanceTransitionError(code),
      );
    },
  );
});

function event(eventType: AttendanceEventKind, index: number) {
  return {
    id: `event-${index}`,
    eventType,
    eventTime: new Date(Date.UTC(2026, 6, 17, 9 + index)),
  };
}

import { AttendanceEventKind, AttendanceEventValue } from './attendance-types';

export type AttendanceDayState = 'CLOSED' | 'OPEN' | 'ON_BREAK';

export class AttendanceTransitionError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export class AttendanceDay {
  private state: AttendanceDayState = 'CLOSED';

  private constructor(readonly events: readonly AttendanceEventValue[]) {
    for (const event of normalizeEvents(events)) this.apply(event.eventType);
  }

  static restore(events: readonly AttendanceEventValue[]) {
    return new AttendanceDay(events);
  }

  get currentState() {
    return this.state;
  }

  assertCanAppend(eventType: AttendanceEventKind) {
    const state = this.state;
    if (isCheckin(eventType) && state !== 'CLOSED') {
      throw new AttendanceTransitionError('ATTENDANCE_ALREADY_OPEN');
    }
    if (isCheckout(eventType) && state === 'CLOSED') {
      throw new AttendanceTransitionError('ATTENDANCE_NOT_OPEN');
    }
    if (eventType === 'BREAK_START' && state === 'CLOSED') {
      throw new AttendanceTransitionError('ATTENDANCE_NOT_OPEN');
    }
    if (eventType === 'BREAK_START' && state === 'ON_BREAK') {
      throw new AttendanceTransitionError('BREAK_ALREADY_OPEN');
    }
    if (eventType === 'BREAK_END' && state !== 'ON_BREAK') {
      throw new AttendanceTransitionError('BREAK_NOT_OPEN');
    }
    if (isCheckout(eventType) && state === 'ON_BREAK') {
      throw new AttendanceTransitionError('BREAK_ALREADY_OPEN');
    }
  }

  append(event: AttendanceEventValue) {
    this.assertCanAppend(event.eventType);
    return AttendanceDay.restore([...this.events, event]);
  }

  private apply(eventType: AttendanceEventKind) {
    this.assertCanAppend(eventType);
    if (isCheckin(eventType)) this.state = 'OPEN';
    if (isCheckout(eventType)) this.state = 'CLOSED';
    if (eventType === 'BREAK_START') this.state = 'ON_BREAK';
    if (eventType === 'BREAK_END') this.state = 'OPEN';
  }
}

export function normalizeEvents(events: readonly AttendanceEventValue[]) {
  return [...events].sort((left, right) => {
    const eventDifference =
      left.eventTime.getTime() - right.eventTime.getTime();
    if (eventDifference) return eventDifference;
    const createdDifference =
      (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0);
    return createdDifference || left.id.localeCompare(right.id);
  });
}

export function isCheckin(eventType: AttendanceEventKind) {
  return eventType === 'CHECKIN' || eventType === 'REGULARIZED_CHECKIN';
}

export function isCheckout(eventType: AttendanceEventKind) {
  return eventType === 'CHECKOUT' || eventType === 'REGULARIZED_CHECKOUT';
}

import { DateTime } from 'luxon';
import {
  AttendanceEventValue,
  AttendanceExceptionValue,
  AttendancePolicySnapshot,
  AttendanceShiftSnapshot,
  AttendanceStatusValue,
} from './attendance-types';
import {
  isCheckin,
  isCheckout,
  normalizeEvents,
} from './attendance-day.aggregate';
import { DateOnly } from './value-objects/date-only';
import { TimeWindow } from './value-objects/time-window';

export type AttendanceCalculationInput = {
  attendanceDate: string;
  timezone: string;
  policy: AttendancePolicySnapshot;
  shift?: AttendanceShiftSnapshot | null;
  events: readonly AttendanceEventValue[];
  exceptionType?: AttendanceExceptionValue | null;
  leaveFraction?: number | null;
  holiday?: boolean;
  weeklyOff?: boolean;
  employeeActive?: boolean;
  finalizing?: boolean;
  evaluationTime?: Date;
};

export type AttendanceCalculation = {
  attendanceStatus: AttendanceStatusValue;
  firstCheckin: Date | null;
  lastCheckout: Date | null;
  totalWorkMinutes: number;
  payableMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  isOpen: boolean;
  isOnBreak: boolean;
  anomalies: string[];
  appliedPolicySnapshot: AttendancePolicySnapshot;
  appliedShiftSnapshot: AttendanceShiftSnapshot | null;
};

type Pairing = {
  work: Array<{ start: Date; end: Date }>;
  breaks: Array<{ start: Date; end: Date }>;
  firstCheckin: Date | null;
  lastCheckout: Date | null;
  isOpen: boolean;
  isOnBreak: boolean;
  anomalies: string[];
};

export function calculateAttendance(
  input: AttendanceCalculationInput,
): AttendanceCalculation {
  DateOnly.parse(input.attendanceDate);
  const evaluationTime = input.evaluationTime ?? new Date();
  const pairing = pairEvents(input.events, evaluationTime, !!input.finalizing);
  const grossWorkMinutes = pairing.work.reduce(
    (total, interval) => total + minutesBetween(interval.start, interval.end),
    0,
  );
  const breakMinutes = pairing.breaks.reduce(
    (total, interval) => total + minutesBetween(interval.start, interval.end),
    0,
  );
  const paidBreak = input.policy.breakRules?.paid === true;
  const totalWorkMinutes = Math.max(
    0,
    grossWorkMinutes - (paidBreak ? 0 : breakMinutes),
  );
  const shiftBounds = input.shift
    ? TimeWindow.create(input.shift.startTime, input.shift.endTime).bounds(
        DateOnly.parse(input.attendanceDate),
        input.shift.timezone || input.timezone,
      )
    : null;
  const lateMinutes = calculateLate(
    pairing.firstCheckin,
    shiftBounds?.start ?? null,
    input.policy.lateAfterMinutes,
  );
  const earlyLeaveMinutes = calculateEarlyLeave(
    pairing.lastCheckout,
    shiftBounds?.end ?? null,
  );
  const overtimeMinutes = Math.max(
    0,
    totalWorkMinutes - input.policy.overtimeAfterMinutes,
  );

  return {
    attendanceStatus: resolveStatus(
      input,
      pairing,
      totalWorkMinutes,
      lateMinutes,
    ),
    firstCheckin: pairing.firstCheckin,
    lastCheckout: pairing.lastCheckout,
    totalWorkMinutes,
    payableMinutes: totalWorkMinutes,
    breakMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes,
    isOpen: pairing.isOpen,
    isOnBreak: pairing.isOnBreak,
    anomalies: pairing.anomalies,
    appliedPolicySnapshot: structuredClone(input.policy),
    appliedShiftSnapshot: input.shift ? structuredClone(input.shift) : null,
  };
}

export function pairEvents(
  events: readonly AttendanceEventValue[],
  evaluationTime: Date,
  finalizing: boolean,
): Pairing {
  const work: Pairing['work'] = [];
  const breaks: Pairing['breaks'] = [];
  const anomalies: string[] = [];
  let workStart: Date | null = null;
  let breakStart: Date | null = null;
  let firstCheckin: Date | null = null;
  let lastCheckout: Date | null = null;

  for (const event of effectiveEvents(events)) {
    if (isCheckin(event.eventType)) {
      if (workStart) {
        anomalies.push('DUPLICATE_CHECKIN');
        continue;
      }
      workStart = event.eventTime;
      firstCheckin ??= event.eventTime;
      continue;
    }
    if (event.eventType === 'BREAK_START') {
      if (!workStart) anomalies.push('BREAK_WITHOUT_ATTENDANCE');
      else if (breakStart) anomalies.push('DUPLICATE_BREAK_START');
      else breakStart = event.eventTime;
      continue;
    }
    if (event.eventType === 'BREAK_END') {
      if (!breakStart) anomalies.push('BREAK_END_WITHOUT_START');
      else {
        breaks.push({ start: breakStart, end: event.eventTime });
        breakStart = null;
      }
      continue;
    }
    if (isCheckout(event.eventType)) {
      if (!workStart) {
        anomalies.push('CHECKOUT_WITHOUT_CHECKIN');
        continue;
      }
      if (breakStart) {
        anomalies.push('UNCLOSED_BREAK');
        breaks.push({ start: breakStart, end: event.eventTime });
        breakStart = null;
      }
      work.push({ start: workStart, end: event.eventTime });
      workStart = null;
      lastCheckout = event.eventTime;
    }
  }

  if (workStart) {
    anomalies.push('MISSING_CHECKOUT');
    if (!finalizing && evaluationTime > workStart) {
      work.push({ start: workStart, end: evaluationTime });
      if (breakStart && evaluationTime > breakStart) {
        breaks.push({ start: breakStart, end: evaluationTime });
      }
    }
  }
  if (breakStart && !anomalies.includes('UNCLOSED_BREAK')) {
    anomalies.push('UNCLOSED_BREAK');
  }

  return {
    work,
    breaks,
    firstCheckin,
    lastCheckout,
    isOpen: !!workStart,
    isOnBreak: !!breakStart,
    anomalies: [...new Set(anomalies)],
  };
}

export function effectiveEvents(
  events: readonly AttendanceEventValue[],
): AttendanceEventValue[] {
  const regularizedCheckin = latestRegularized(events, 'REGULARIZED_CHECKIN');
  const regularizedCheckout = latestRegularized(events, 'REGULARIZED_CHECKOUT');
  return normalizeEvents([
    ...events.filter((event) => {
      if (regularizedCheckin && isCheckin(event.eventType)) return false;
      if (regularizedCheckout && isCheckout(event.eventType)) return false;
      return true;
    }),
    ...(regularizedCheckin ? [regularizedCheckin] : []),
    ...(regularizedCheckout ? [regularizedCheckout] : []),
  ]);
}

function latestRegularized(
  events: readonly AttendanceEventValue[],
  eventType: 'REGULARIZED_CHECKIN' | 'REGULARIZED_CHECKOUT',
) {
  return events
    .filter((event) => event.eventType === eventType)
    .sort(
      (left, right) =>
        (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0) ||
        right.id.localeCompare(left.id),
    )[0];
}

function resolveStatus(
  input: AttendanceCalculationInput,
  pairing: Pairing,
  workMinutes: number,
  lateMinutes: number,
): AttendanceStatusValue {
  if (input.employeeActive === false) return 'ABSENT';
  if (!pairing.firstCheckin) {
    if (input.exceptionType === 'LEAVE') {
      return input.leaveFraction === 0.5 ? 'HALF_DAY' : 'ON_LEAVE';
    }
    if (input.exceptionType === 'ON_DUTY' || input.exceptionType === 'WFH') {
      return 'ON_DUTY';
    }
    if (input.holiday) return 'HOLIDAY';
    if (input.weeklyOff) return 'WEEKLY_OFF';
    return 'ABSENT';
  }
  if (
    input.holiday ||
    input.exceptionType === 'ON_DUTY' ||
    input.exceptionType === 'WFH'
  ) {
    return 'ON_DUTY';
  }
  if (!input.finalizing && pairing.isOpen) return 'PRESENT_OPEN';
  if (
    workMinutes < input.policy.minimumWorkMinutes ||
    lateMinutes >= input.policy.halfDayAfterMinutes
  ) {
    return 'HALF_DAY';
  }
  return 'PRESENT';
}

function calculateLate(
  firstCheckin: Date | null,
  shiftStart: DateTime | null,
  graceMinutes: number,
) {
  if (!firstCheckin || !shiftStart) return 0;
  const difference = Math.max(
    0,
    Math.floor(
      DateTime.fromJSDate(firstCheckin).diff(shiftStart, 'minutes').minutes,
    ),
  );
  return difference > graceMinutes ? difference : 0;
}

function calculateEarlyLeave(
  lastCheckout: Date | null,
  shiftEnd: DateTime | null,
) {
  if (!lastCheckout || !shiftEnd) return 0;
  return Math.max(
    0,
    Math.floor(
      shiftEnd.diff(DateTime.fromJSDate(lastCheckout), 'minutes').minutes,
    ),
  );
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
}

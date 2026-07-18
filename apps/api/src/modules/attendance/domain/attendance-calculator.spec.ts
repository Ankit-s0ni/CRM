import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateAttendance, pairEvents } from './attendance-calculator';
import {
  AttendanceEventKind,
  AttendanceExceptionValue,
  AttendancePolicySnapshot,
  AttendanceShiftSnapshot,
} from './attendance-types';

const policy = {
  id: 'policy-1',
  name: 'Standard',
  lateAfterMinutes: 15,
  halfDayAfterMinutes: 240,
  minimumWorkMinutes: 480,
  overtimeAfterMinutes: 540,
  breakRules: { paid: false },
};
const shift = {
  id: 'shift-1',
  name: 'Day',
  startTime: '09:00',
  endTime: '18:00',
  timezone: 'UTC',
};

describe('calculateAttendance golden matrix', () => {
  it('marks an attributed half-day leave without discarding the exception evidence', () => {
    const result = calculateAttendance({
      ...input([]),
      exceptionType: 'LEAVE',
      leaveFraction: 0.5,
      finalizing: true,
    });
    expect(result.attendanceStatus).toBe('HALF_DAY');
  });

  const durationCases = Array.from({ length: 20 }, (_, index) => {
    const minutes = 60 + index * 25;
    return [minutes, minutes] as const;
  });
  it.each(durationCases)(
    'computes %i closed work minutes as %i',
    (duration, expected) => {
      const result = calculateAttendance(
        input([
          event('CHECKIN', at(9, 0), 'a'),
          event('CHECKOUT', plusMinutes(at(9, 0), duration), 'b'),
        ]),
      );
      expect(result.totalWorkMinutes).toBe(expected);
    },
  );

  const lateCases = [0, 5, 10, 15, 16, 20, 30, 60, 180, 240].map(
    (minutes) => [minutes, minutes <= 15 ? 0 : minutes] as const,
  );
  it.each(lateCases)(
    'applies late grace at %i minutes',
    (minutes, expected) => {
      const result = calculateAttendance(
        input([
          event('CHECKIN', plusMinutes(at(9, 0), minutes), 'a'),
          event('CHECKOUT', at(18, 0), 'b'),
        ]),
      );
      expect(result.lateMinutes).toBe(expected);
    },
  );

  const overtimeCases = [480, 500, 539, 540, 541, 560, 600, 660, 720, 900].map(
    (minutes) => [minutes, Math.max(0, minutes - 540)] as const,
  );
  it.each(overtimeCases)(
    'computes overtime for %i work minutes',
    (minutes, expected) => {
      const result = calculateAttendance(
        input([
          event('CHECKIN', at(8, 0), 'a'),
          event('CHECKOUT', plusMinutes(at(8, 0), minutes), 'b'),
        ]),
      );
      expect(result.overtimeMinutes).toBe(expected);
    },
  );

  const precedenceCases: Array<{
    name: string;
    events?: ReturnType<typeof event>[];
    holiday?: boolean;
    weeklyOff?: boolean;
    exceptionType?: AttendanceExceptionValue;
    finalizing?: boolean;
    expected: string;
  }> = [
    { name: 'ordinary absence', expected: 'ABSENT' },
    { name: 'holiday', holiday: true, expected: 'HOLIDAY' },
    { name: 'weekly off', weeklyOff: true, expected: 'WEEKLY_OFF' },
    { name: 'leave', exceptionType: 'LEAVE', expected: 'ON_LEAVE' },
    { name: 'on duty', exceptionType: 'ON_DUTY', expected: 'ON_DUTY' },
    { name: 'work from home', exceptionType: 'WFH', expected: 'ON_DUTY' },
    {
      name: 'holiday punch',
      holiday: true,
      finalizing: true,
      events: fullDay(),
      expected: 'ON_DUTY',
    },
    {
      name: 'open day',
      events: [event('CHECKIN', at(9, 0), 'a')],
      expected: 'PRESENT_OPEN',
    },
    {
      name: 'full day',
      events: fullDay(),
      finalizing: true,
      expected: 'PRESENT',
    },
    {
      name: 'short day',
      events: [
        event('CHECKIN', at(9, 0), 'a'),
        event('CHECKOUT', at(13, 0), 'b'),
      ],
      finalizing: true,
      expected: 'HALF_DAY',
    },
    {
      name: 'weekly-off punch override',
      weeklyOff: true,
      events: fullDay(),
      finalizing: true,
      expected: 'PRESENT',
    },
    {
      name: 'leave punch override',
      exceptionType: 'LEAVE',
      events: fullDay(),
      finalizing: true,
      expected: 'PRESENT',
    },
  ];
  it.each(precedenceCases)('$name resolves to $expected', (testCase) => {
    const result = calculateAttendance({
      ...input(testCase.events ?? []),
      holiday: testCase.holiday,
      weeklyOff: testCase.weeklyOff,
      exceptionType: testCase.exceptionType,
      finalizing: testCase.finalizing,
    });
    expect(result.attendanceStatus).toBe(testCase.expected);
  });

  const breakCases = [0, 5, 10, 15, 30, 45, 60, 75, 90, 120].map(
    (minutes) => [minutes, 540 - minutes] as const,
  );
  it.each(breakCases)(
    'subtracts %i unpaid break minutes',
    (breakMinutes, expectedWork) => {
      const events = [event('CHECKIN', at(9, 0), 'a')];
      if (breakMinutes) {
        events.push(event('BREAK_START', at(12, 0), 'b'));
        events.push(
          event('BREAK_END', plusMinutes(at(12, 0), breakMinutes), 'c'),
        );
      }
      events.push(event('CHECKOUT', at(18, 0), 'd'));
      const result = calculateAttendance(input(events));
      expect(result.totalWorkMinutes).toBe(expectedWork);
      expect(result.breakMinutes).toBe(breakMinutes);
    },
  );

  it('keeps paid breaks in payable work', () => {
    const result = calculateAttendance({
      ...input([
        event('CHECKIN', at(9, 0), 'a'),
        event('BREAK_START', at(12, 0), 'b'),
        event('BREAK_END', at(13, 0), 'c'),
        event('CHECKOUT', at(18, 0), 'd'),
      ]),
      policy: { ...policy, breakRules: { paid: true } },
    });
    expect(result).toMatchObject({ totalWorkMinutes: 540, breakMinutes: 60 });
  });

  it('pairs multiple work sessions and sorts deterministic ties', () => {
    const result = calculateAttendance(
      input([
        event('CHECKOUT', at(18, 0), 'd'),
        event('CHECKIN', at(14, 0), 'c'),
        event('CHECKOUT', at(13, 0), 'b'),
        event('CHECKIN', at(9, 0), 'a'),
      ]),
    );
    expect(result.totalWorkMinutes).toBe(480);
    expect(result.anomalies).toEqual([]);
  });

  it('uses append-only regularized events as the effective check-in and checkout', () => {
    const result = calculateAttendance(
      input([
        event('CHECKIN', at(10, 0), 'original-in'),
        event('CHECKOUT', at(16, 0), 'original-out'),
        event('REGULARIZED_CHECKIN', at(9, 0), 'regularized-in'),
        event('REGULARIZED_CHECKOUT', at(18, 0), 'regularized-out'),
      ]),
    );

    expect(result).toMatchObject({
      firstCheckin: at(9, 0),
      lastCheckout: at(18, 0),
      totalWorkMinutes: 540,
      anomalies: [],
    });
  });

  it('flags unpaired legacy streams without inventing finalized work', () => {
    const result = calculateAttendance({
      ...input([event('CHECKIN', at(9, 0), 'a')]),
      finalizing: true,
    });
    expect(result.totalWorkMinutes).toBe(0);
    expect(result.anomalies).toContain('MISSING_CHECKOUT');
  });

  it('snapshots policy and shift immutably', () => {
    const result = calculateAttendance(input(fullDay()));
    policy.minimumWorkMinutes = 1;
    expect(result.appliedPolicySnapshot.minimumWorkMinutes).toBe(480);
    policy.minimumWorkMinutes = 480;
    expect(result.appliedShiftSnapshot).toEqual(shift);
  });
});

describe('pairEvents evidence flags', () => {
  const anomalyCases: Array<[AttendanceEventKind[], string]> = [
    [['CHECKOUT'], 'CHECKOUT_WITHOUT_CHECKIN'],
    [['BREAK_START'], 'BREAK_WITHOUT_ATTENDANCE'],
    [['BREAK_END'], 'BREAK_END_WITHOUT_START'],
    [['CHECKIN', 'CHECKIN'], 'DUPLICATE_CHECKIN'],
    [['CHECKIN'], 'MISSING_CHECKOUT'],
    [['CHECKIN', 'BREAK_START'], 'UNCLOSED_BREAK'],
  ];
  it.each(anomalyCases)('flags %s as %s', (types, expected) => {
    const events = types.map((type, index) =>
      event(type, plusMinutes(at(9, 0), index * 10), `${index}`),
    );
    expect(pairEvents(events, at(18, 0), true).anomalies).toContain(expected);
  });
});

describe('July 2026 versioned acceptance calendar', () => {
  const fixture = JSON.parse(
    readFileSync(join(__dirname, 'fixtures/july-2026-golden.json'), 'utf8'),
  ) as GoldenFixture;

  it.each(fixture.cases)('$name', (testCase) => {
    const testPolicy = { ...fixture.policy, ...testCase.policy };
    const testShift =
      testCase.shift === null
        ? null
        : { ...fixture.shift, ...(testCase.shift ?? {}) };
    const result = calculateAttendance({
      attendanceDate: testCase.attendanceDate,
      timezone: testCase.timezone ?? 'UTC',
      policy: testPolicy,
      shift: testShift,
      events: testCase.events.map(([eventType, eventTime], index) => ({
        id: `golden-${index}`,
        eventType,
        eventTime: new Date(eventTime),
      })),
      exceptionType: testCase.exceptionType,
      holiday: testCase.holiday,
      weeklyOff: testCase.weeklyOff,
      employeeActive: testCase.employeeActive,
      finalizing: true,
      evaluationTime: new Date(`${testCase.attendanceDate}T23:59:59.000Z`),
    });

    expect({
      status: result.attendanceStatus,
      work: result.totalWorkMinutes,
      break: result.breakMinutes,
      late: result.lateMinutes,
      early: result.earlyLeaveMinutes,
      overtime: result.overtimeMinutes,
      anomalies: result.anomalies,
    }).toEqual(testCase.expected);
    expect(result.appliedPolicySnapshot).toEqual(testPolicy);
    expect(result.appliedShiftSnapshot).toEqual(testShift);
  });
});

type GoldenFixture = {
  version: number;
  policy: AttendancePolicySnapshot;
  shift: AttendanceShiftSnapshot;
  cases: Array<{
    name: string;
    attendanceDate: string;
    timezone?: string;
    policy?: Partial<AttendancePolicySnapshot>;
    shift?: Partial<AttendanceShiftSnapshot> | null;
    events: Array<[AttendanceEventKind, string]>;
    exceptionType?: AttendanceExceptionValue;
    holiday?: boolean;
    weeklyOff?: boolean;
    employeeActive?: boolean;
    expected: {
      status: string;
      work: number;
      break: number;
      late: number;
      early: number;
      overtime: number;
      anomalies: string[];
    };
  }>;
};

function input(events: ReturnType<typeof event>[]) {
  return {
    attendanceDate: '2026-07-17',
    timezone: 'UTC',
    policy,
    shift,
    events,
    evaluationTime: at(18, 0),
  };
}

function fullDay() {
  return [event('CHECKIN', at(9, 0), 'a'), event('CHECKOUT', at(18, 0), 'b')];
}

function event(eventType: AttendanceEventKind, eventTime: Date, id: string) {
  return { id, eventType, eventTime };
}

function at(hour: number, minute: number) {
  return new Date(Date.UTC(2026, 6, 17, hour, minute));
}

function plusMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

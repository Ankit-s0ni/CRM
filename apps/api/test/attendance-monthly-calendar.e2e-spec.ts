import {
  calendarDisplayStatus,
  summarizeCalendar,
  type CalendarDay,
} from '../src/products/attendance/core/application/attendance-runtime.service';

describe('Monthly attendance calendar', () => {
  it.each([
    [
      'recorded present',
      { log: { attendanceStatus: 'PRESENT', lateMinutes: 0 } },
      'PRESENT',
    ],
    [
      'recorded late arrival',
      { log: { attendanceStatus: 'PRESENT', lateMinutes: 12 } },
      'LATE',
    ],
    ['holiday', { holiday: true }, 'HOLIDAY'],
    ['weekly off', { weeklyOff: true }, 'WEEKLY_OFF'],
    ['approved leave', { leave: true }, 'ON_LEAVE'],
    [
      'approved leave on a future scheduled working day',
      { leave: true, isFuture: true },
      'ON_LEAVE',
    ],
    [
      'approved half-day leave',
      { leave: true, halfDayLeave: true },
      'HALF_DAY',
    ],
    ['future working day', { isFuture: true }, 'UPCOMING'],
    ['today before punching', { isToday: true }, 'WORKING_DAY'],
    ['completed day without a punch', {}, 'ABSENT'],
    ['before joining', { notApplicable: true }, 'NOT_APPLICABLE'],
  ])('classifies %s', (_label, overrides, expected) => {
    expect(
      calendarDisplayStatus({
        holiday: false,
        weeklyOff: false,
        leave: false,
        halfDayLeave: false,
        onDuty: false,
        notApplicable: false,
        isToday: false,
        isFuture: false,
        ...overrides,
      }),
    ).toEqual(expect.objectContaining({ status: expected }));
  });

  it('summarizes display states and recorded minutes', () => {
    const day = (
      status: string,
      totalWorkMinutes = 0,
      overtimeMinutes = 0,
    ): CalendarDay => ({ status, totalWorkMinutes, overtimeMinutes });
    const summary = summarizeCalendar([
      day('PRESENT', 480),
      day('LATE', 450),
      day('ABSENT'),
      day('ON_LEAVE'),
      day('HALF_DAY', 240),
      day('HOLIDAY'),
      day('WEEKLY_OFF'),
      day('NOT_APPLICABLE'),
      day('PRESENT', 510, 30),
    ]);

    expect(summary).toMatchObject({
      days: 8,
      present: 2,
      lateDays: 1,
      absent: 1,
      leaveDays: 1,
      halfDays: 1,
      holidays: 1,
      weeklyOffs: 1,
      workMinutes: 1680,
      overtimeMinutes: 30,
    });
  });
});

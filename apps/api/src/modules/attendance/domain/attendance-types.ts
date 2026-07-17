export type AttendanceEventKind =
  | 'CHECKIN'
  | 'CHECKOUT'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'REGULARIZED_CHECKIN'
  | 'REGULARIZED_CHECKOUT';

export type AttendanceEventValue = {
  id: string;
  eventType: AttendanceEventKind;
  eventTime: Date;
  createdAt?: Date;
};

export type AttendanceStatusValue =
  | 'PRESENT_OPEN'
  | 'PRESENT'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKLY_OFF'
  | 'ON_DUTY';

export type AttendancePolicySnapshot = {
  id?: string;
  name?: string;
  lateAfterMinutes: number;
  halfDayAfterMinutes: number;
  minimumWorkMinutes: number;
  overtimeAfterMinutes: number;
  allowEarlyCheckin?: boolean;
  allowEarlyCheckout?: boolean;
  breakRules?: { paid?: boolean };
};

export type AttendanceShiftSnapshot = {
  id?: string;
  name?: string;
  startTime: string;
  endTime: string;
  timezone: string;
};

export type AttendanceExceptionValue = 'ON_DUTY' | 'LEAVE' | 'WFH' | 'OTHER';

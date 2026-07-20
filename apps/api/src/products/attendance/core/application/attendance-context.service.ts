import { ForbiddenException, Injectable } from '@nestjs/common';
import { ExceptionType, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import type { PrismaTransaction } from '../../../../shared/database/prisma.service';
import { attributeAttendanceDate } from '../domain/date-attributor';
import {
  AttendanceExceptionValue,
  AttendancePolicySnapshot,
  AttendanceShiftSnapshot,
} from '../domain/attendance-types';
import { DateOnly } from '../domain/value-objects/date-only';

type EmployeeForRuntime = Prisma.EmployeeGetPayload<{
  include: {
    defaultShift: true;
    officeAssignments: { include: { office: true } };
  };
}>;

export type ResolvedAttendanceContext = {
  employee: EmployeeForRuntime;
  attendanceDate: DateOnly;
  timezone: string;
  shift: AttendanceShiftSnapshot | null;
  appliedShiftId: string | null;
  policy: AttendancePolicySnapshot;
  holiday: boolean;
  weeklyOff: boolean;
  weeklyOffs: Prisma.JsonValue;
  exceptionId: string | null;
  exceptionType: AttendanceExceptionValue | null;
  leaveFraction: number | null;
};

@Injectable()
export class AttendanceContextService {
  async employeeForUser(tx: PrismaTransaction, userId: string) {
    const employee = await tx.employee.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        defaultShift: true,
        officeAssignments: {
          where: { isPrimary: true },
          take: 1,
          include: { office: true },
        },
      },
    });
    if (!employee) {
      throw new ForbiddenException({
        code: 'EMPLOYEE_PROFILE_REQUIRED',
        message: 'An active employee profile is required',
      });
    }
    return employee;
  }

  async resolve(
    tx: PrismaTransaction,
    employee: EmployeeForRuntime,
    instant: Date,
  ): Promise<ResolvedAttendanceContext> {
    const settings = await tx.tenantSettings.findUniqueOrThrow({
      where: { tenantId: employee.tenantId },
    });
    const timezone =
      employee.officeAssignments[0]?.office.timezone ?? settings.timezone;
    const localDate = DateOnly.fromInstant(instant, timezone);
    const previousDate = localDate.plusDays(-1);
    const rosters = await tx.employeeShiftRoster.findMany({
      where: {
        employeeId: employee.id,
        rosterDate: {
          in: [localDate.toDatabaseDate(), previousDate.toDatabaseDate()],
        },
      },
      include: { shift: true },
    });
    const rosterByDate = new Map(
      rosters.map((roster) => [
        roster.rosterDate.toISOString().slice(0, 10),
        roster,
      ]),
    );
    const fallbackShift =
      employee.defaultShift ??
      (await tx.shift.findFirst({ orderBy: { createdAt: 'asc' } }));
    const previousShift = rosterByDate.get(previousDate.value)?.shift;
    const candidate = previousShift ?? fallbackShift;
    const candidateSnapshot = candidate
      ? shiftSnapshot(candidate, timezone)
      : settingsShift(
          settings.workingDayStart,
          settings.workingDayEnd,
          timezone,
        );
    const attributed = attributeAttendanceDate(
      instant,
      timezone,
      candidateSnapshot,
    );
    const roster = rosterByDate.get(attributed.value);
    const appliedShift = roster?.shift ?? fallbackShift;
    const shift = appliedShift
      ? shiftSnapshot(appliedShift, timezone)
      : settingsShift(
          settings.workingDayStart,
          settings.workingDayEnd,
          timezone,
        );
    const attendanceDate = attributeAttendanceDate(instant, timezone, shift);
    const date = attendanceDate.toDatabaseDate();
    const [assignments, holiday, exception] = await Promise.all([
      tx.policyAssignment.findMany({
        where: {
          OR: [
            { scope: 'EMPLOYEE', employeeId: employee.id },
            { scope: 'DEPARTMENT', deptId: employee.deptId },
            { scope: 'TENANT_DEFAULT' },
          ],
        },
        include: { policy: true },
      }),
      tx.tenantHoliday.findFirst({
        where: {
          holidayDate: date,
          OR: [
            { officeLocationId: null },
            {
              officeLocationId:
                employee.officeAssignments[0]?.officeLocationId ?? undefined,
            },
          ],
        },
      }),
      tx.attendanceException.findFirst({
        where: {
          employeeId: employee.id,
          startDate: { lte: date },
          endDate: { gte: date },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const assignment =
      assignments.find(({ scope }) => scope === 'EMPLOYEE') ??
      assignments.find(({ scope }) => scope === 'DEPARTMENT') ??
      assignments.find(({ scope }) => scope === 'TENANT_DEFAULT');
    const policy = assignment
      ? policySnapshot(assignment.policy)
      : fallbackPolicy();
    const weeklyOffs = assignment?.policy.weeklyOffs ?? settings.weeklyOffs;

    return {
      employee,
      attendanceDate,
      timezone,
      shift,
      appliedShiftId: appliedShift?.id ?? null,
      policy,
      holiday: !!holiday,
      weeklyOff: isWeeklyOff(weeklyOffs, attendanceDate.value, timezone),
      weeklyOffs,
      exceptionId: exception?.id ?? null,
      exceptionType: exception ? exceptionType(exception.exceptionType) : null,
      leaveFraction: exception
        ? exceptionLeaveFraction(exception, attendanceDate.value)
        : null,
    };
  }
}

function exceptionLeaveFraction(
  exception: {
    exceptionType: ExceptionType;
    startDate: Date;
    endDate: Date;
    halfDayStart: boolean;
    halfDayEnd: boolean;
  },
  attendanceDate: string,
) {
  if (exception.exceptionType !== ExceptionType.LEAVE) return null;
  const isStart =
    exception.startDate.toISOString().slice(0, 10) === attendanceDate;
  const isEnd = exception.endDate.toISOString().slice(0, 10) === attendanceDate;
  return (isStart && exception.halfDayStart) || (isEnd && exception.halfDayEnd)
    ? 0.5
    : 1;
}

function shiftSnapshot(
  shift: { id: string; name: string; startTime: Date; endTime: Date },
  timezone: string,
): AttendanceShiftSnapshot {
  return {
    id: shift.id,
    name: shift.name,
    startTime: clock(shift.startTime),
    endTime: clock(shift.endTime),
    timezone,
  };
}

function settingsShift(
  startTime: string,
  endTime: string,
  timezone: string,
): AttendanceShiftSnapshot {
  return { name: 'Workspace default', startTime, endTime, timezone };
}

function policySnapshot(policy: {
  id: string;
  name: string;
  lateAfterMinutes: number;
  halfDayAfterMinutes: number;
  minimumWorkMinutes: number;
  overtimeAfterMinutes: number;
  allowEarlyCheckin: boolean;
  allowEarlyCheckout: boolean;
  requireFaceMatch: boolean;
  allowBiometricOptOut: boolean;
  requireRegisteredDevice: boolean;
  requireGeofence: boolean;
  locationMode: 'NONE' | 'OFFICE_GEOFENCE' | 'FIELD_GPS';
  selfieMode: 'DISABLED' | 'REQUIRED';
  fieldTrackingEnabled: boolean;
  allowHybridFieldTracking: boolean;
  maxFaceAttempts: number;
  maxOfflineSyncHours: number;
  breakRules: Prisma.JsonValue;
}): AttendancePolicySnapshot {
  const breakRules = jsonObject(policy.breakRules);
  return {
    id: policy.id,
    name: policy.name,
    lateAfterMinutes: policy.lateAfterMinutes,
    halfDayAfterMinutes: policy.halfDayAfterMinutes,
    minimumWorkMinutes: policy.minimumWorkMinutes,
    overtimeAfterMinutes: policy.overtimeAfterMinutes,
    allowEarlyCheckin: policy.allowEarlyCheckin,
    allowEarlyCheckout: policy.allowEarlyCheckout,
    requireFaceMatch: policy.requireFaceMatch,
    allowBiometricOptOut: policy.allowBiometricOptOut,
    requireRegisteredDevice: policy.requireRegisteredDevice,
    requireGeofence: policy.requireGeofence,
    locationMode: policy.locationMode,
    selfieMode: policy.selfieMode,
    fieldTrackingEnabled: policy.fieldTrackingEnabled,
    allowHybridFieldTracking: policy.allowHybridFieldTracking,
    maxFaceAttempts: policy.maxFaceAttempts,
    maxOfflineSyncHours: policy.maxOfflineSyncHours,
    breakRules: { paid: breakRules.paid === true },
  };
}

function fallbackPolicy(): AttendancePolicySnapshot {
  return {
    name: 'Workspace default',
    lateAfterMinutes: 15,
    halfDayAfterMinutes: 240,
    minimumWorkMinutes: 480,
    overtimeAfterMinutes: 540,
    allowEarlyCheckin: true,
    allowEarlyCheckout: true,
    requireFaceMatch: false,
    allowBiometricOptOut: false,
    requireRegisteredDevice: true,
    requireGeofence: true,
    locationMode: 'OFFICE_GEOFENCE',
    selfieMode: 'DISABLED',
    fieldTrackingEnabled: false,
    allowHybridFieldTracking: false,
    maxFaceAttempts: 3,
    maxOfflineSyncHours: 48,
    breakRules: { paid: false },
  };
}

function isWeeklyOff(value: Prisma.JsonValue, date: string, timezone: string) {
  if (!Array.isArray(value)) return false;
  const local = DateTime.fromISO(date, { zone: timezone });
  const weekday = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][
    local.weekday - 1
  ];
  const occurrence = Math.ceil(local.day / 7);
  return value.some((entry) => {
    if (entry === weekday) return true;
    const object = jsonObject(entry);
    return (
      object.weekday === weekday &&
      (object.occurrences === undefined ||
        (Array.isArray(object.occurrences) &&
          object.occurrences.includes(occurrence)))
    );
  });
}

function exceptionType(value: ExceptionType): AttendanceExceptionValue {
  return value;
}

function jsonObject(value: Prisma.JsonValue | undefined) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

function clock(value: Date) {
  return value.toISOString().slice(11, 16);
}

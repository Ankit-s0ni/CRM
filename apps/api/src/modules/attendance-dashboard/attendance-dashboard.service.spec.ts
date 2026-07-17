import {
  AttendanceStatus,
  EventType,
  SecurityAlertType,
  WorkType,
} from '@prisma/client';
import { AttendanceDashboardService } from './attendance-dashboard.service';

describe('AttendanceDashboardService', () => {
  it('derives live KPIs, employee states, and attention counts from persisted data', async () => {
    const tx = {
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({ timezone: 'Asia/Muscat' }),
      },
      attendanceLog: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            dashboardLog(AttendanceStatus.PRESENT_OPEN, WorkType.OFFICE),
            dashboardLog(AttendanceStatus.PRESENT, WorkType.FIELD, 25),
            dashboardLog(AttendanceStatus.ABSENT, WorkType.OFFICE),
            dashboardLog(
              AttendanceStatus.PRESENT_OPEN,
              WorkType.OFFICE,
              0,
              EventType.BREAK_START,
            ),
          ]),
      },
      employee: {
        count: jest.fn().mockResolvedValue(6),
        findMany: jest
          .fn()
          .mockResolvedValue([
            dashboardEmployee('employee-1', WorkType.OFFICE),
            dashboardEmployee(
              'employee-2',
              WorkType.FIELD,
              AttendanceStatus.PRESENT,
              25,
            ),
          ]),
      },
      regularizationRequest: { count: jest.fn().mockResolvedValue(3) },
      securityAlert: {
        groupBy: jest.fn().mockResolvedValue([
          {
            alertType: SecurityAlertType.ABSENTEE,
            _count: { _all: 5 },
          },
          {
            alertType: SecurityAlertType.GEOFENCE_VIOLATION,
            _count: { _all: 2 },
          },
        ]),
      },
    };
    const prisma = {
      forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new AttendanceDashboardService(
      prisma as never,
      { tenantId: 'tenant-1' } as never,
    );

    const result = await service.get({ date: '2026-07-17' });

    expect(result.data.timezone).toBe('Asia/Muscat');
    expect(result.data.summary).toEqual({
      present: 3,
      late: 1,
      absent: 1,
      onField: 1,
      onBreak: 1,
      notYetIn: 2,
    });
    expect(result.data.employees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'employee-1', status: 'NOT_YET_IN' }),
        expect.objectContaining({ id: 'employee-2', status: 'ON_FIELD' }),
      ]),
    );
    expect(result.data.attention).toEqual({
      pendingRegularizations: 3,
      openSecurityViolations: 2,
      absenteeAlerts: 5,
    });
  });

  it('rejects impossible ISO dates', async () => {
    const tx = {
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({ timezone: 'UTC' }),
      },
    };
    const service = new AttendanceDashboardService(
      {
        forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      } as never,
      { tenantId: 'tenant-1' } as never,
    );

    await expect(service.get({ date: '2026-02-30' })).rejects.toThrow(
      'Dashboard date must be a valid ISO date',
    );
  });
});

function dashboardLog(
  attendanceStatus: AttendanceStatus,
  workType: WorkType,
  lateMinutes = 0,
  eventType?: EventType,
) {
  return {
    attendanceStatus,
    lateMinutes,
    employee: { workType },
    events: eventType ? [{ eventType }] : [],
  };
}

function dashboardEmployee(
  id: string,
  workType: WorkType,
  attendanceStatus?: AttendanceStatus,
  lateMinutes = 0,
) {
  return {
    id,
    employeeCode: id.toUpperCase(),
    fullName: id === 'employee-1' ? 'No Punch Employee' : 'Field Employee',
    workType,
    department: { id: 'department-1', name: 'Operations' },
    designation: { name: 'Coordinator' },
    officeAssignments: [
      { office: { id: 'office-1', officeName: 'Muscat HQ' } },
    ],
    attendanceDays: attendanceStatus
      ? [
          {
            attendanceStatus,
            lateMinutes,
            firstCheckin: new Date('2026-07-17T05:00:00.000Z'),
            appliedShift: { id: 'shift-1', name: 'Day' },
            events: [],
          },
        ]
      : [],
  };
}

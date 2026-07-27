import { JobStatus, ReportType } from '@prisma/client';
import { ReportingProcessor } from './reporting.processor';

describe('ReportingProcessor', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-27T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a full monthly attendance report with recorded and derived days', async () => {
    const putReport = jest.fn().mockResolvedValue('reports/muster.csv');
    const tx = {
      reportExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'report-1',
          tenantId: 'tenant-1',
          reportType: ReportType.MUSTER,
          status: JobStatus.PENDING,
          filters: { period: '2026-07' },
        }),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'report-1', ...data }),
          ),
      },
      employee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'employee-1',
            employeeCode: 'EMP-0001',
            fullName: 'Acme Employee',
            dateOfJoining: new Date('2026-07-01T00:00:00.000Z'),
            dateOfExit: null,
            deptId: 'department-1',
            department: { name: 'Operations' },
            designation: { name: 'Coordinator' },
            defaultShift: { name: 'General' },
            officeAssignments: [
              {
                office: {
                  id: 'office-1',
                  officeName: 'Muscat',
                  timezone: 'Asia/Muscat',
                },
              },
            ],
            attendanceDays: [
              {
                attendanceDate: new Date('2026-07-23T00:00:00.000Z'),
                attendanceStatus: 'PRESENT',
                firstCheckin: new Date('2026-07-23T05:00:00.000Z'),
                lastCheckout: new Date('2026-07-23T14:30:00.000Z'),
                totalWorkMinutes: 540,
                breakMinutes: 30,
                lateMinutes: 0,
                earlyLeaveMinutes: 0,
                overtimeMinutes: 30,
                finalizedAt: new Date('2026-07-23T15:00:00.000Z'),
                updatedAt: new Date('2026-07-23T15:00:00.000Z'),
              },
            ],
          },
        ]),
      },
      tenantSettings: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          timezone: 'Asia/Kolkata',
          weeklyOffs: ['SAT', 'SUN'],
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        }),
      },
      policyAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      tenantHoliday: {
        findMany: jest.fn().mockResolvedValue([
          {
            holidayDate: new Date('2026-07-03T00:00:00.000Z'),
            holidayName: 'Public holiday',
            officeLocationId: 'office-1',
          },
        ]),
      },
      attendanceException: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      leaveRequest: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      employeeShiftRoster: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      forAdmin: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const processor = new ReportingProcessor(
      prisma as never,
      { putReport } as never,
    );

    await processor.process({ tenantId: 'tenant-1', reportId: 'report-1' });

    const csv = (putReport.mock.calls[0][4] as Buffer).toString('utf8');
    expect(csv.trim().split('\n')).toHaveLength(32);
    expect(csv).toContain('"Attendance date","Status"');
    expect(csv).toContain('"Timezone","Check-in","Checkout"');
    expect(csv).toContain('"Worked (HH:MM)","Worked minutes"');
    expect(csv).toContain('"2026-07-03","Holiday","Public holiday","HOLIDAY"');
    expect(csv).toContain('"2026-07-04","Weekly off","","POLICY"');
    expect(csv).toContain(
      '"2026-07-23","Present","","ATTENDANCE_LOG","General","Asia/Muscat","09:00:00","18:30:00"',
    );
    expect(csv).toContain('"09:00","540","30","0","0","30","Finalized"');
    expect(csv).toContain('"2026-07-28","Upcoming","","SCHEDULE"');
  });
});

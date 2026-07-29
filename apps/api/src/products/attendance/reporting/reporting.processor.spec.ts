import { JobStatus, ReportFormat, ReportType } from '@prisma/client';
import ExcelJS from 'exceljs';
import { ReportingProcessor } from './reporting.processor';

describe('ReportingProcessor', () => {
  beforeEach(() => {
    jest
      .useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
      .setSystemTime(new Date('2026-07-27T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a full monthly attendance report with recorded and derived days', async () => {
    const putReport = jest.fn().mockResolvedValue('reports/muster.xlsx');
    const tx = {
      reportExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'report-1',
          tenantId: 'tenant-1',
          reportType: ReportType.MUSTER,
          format: ReportFormat.XLSX,
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
                events: [
                  {
                    eventType: 'CHECKIN',
                    source: 'MOBILE',
                    createdBy: 'employee-user-1',
                  },
                  {
                    eventType: 'CHECKOUT',
                    source: 'MOBILE',
                    createdBy: 'employee-user-1',
                  },
                ],
              },
              {
                attendanceDate: new Date('2026-07-24T00:00:00.000Z'),
                attendanceStatus: 'PRESENT',
                firstCheckin: new Date('2026-07-24T05:00:00.000Z'),
                lastCheckout: new Date('2026-07-24T14:00:00.000Z'),
                totalWorkMinutes: 510,
                breakMinutes: 30,
                lateMinutes: 0,
                earlyLeaveMinutes: 0,
                overtimeMinutes: 0,
                finalizedAt: new Date('2026-07-24T15:00:00.000Z'),
                updatedAt: new Date('2026-07-24T15:00:00.000Z'),
                events: [
                  {
                    eventType: 'REGULARIZED_CHECKIN',
                    source: 'REGULARIZED',
                    createdBy: 'hr-user-1',
                  },
                  {
                    eventType: 'REGULARIZED_CHECKOUT',
                    source: 'REGULARIZED',
                    createdBy: 'hr-user-1',
                  },
                ],
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

    expect(putReport).toHaveBeenCalledWith(
      'tenant-1',
      'report-1',
      'xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      expect.any(Buffer),
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(putReport.mock.calls[0][4] as never);
    expect(workbook.worksheets).toHaveLength(22);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(
      expect.arrayContaining(['01-Jul', '23-Jul', '31-Jul']),
    );
    expect(workbook.getWorksheet('03-Jul')).toBeUndefined();
    expect(workbook.getWorksheet('04-Jul')).toBeUndefined();

    const selfMarkedSheet = workbook.getWorksheet('23-Jul');
    expect(selfMarkedSheet?.getRow(3).values).toEqual(
      expect.arrayContaining([
        'Attendance date',
        'Marked by',
        'Worked (HH:MM)',
      ]),
    );
    expect(selfMarkedSheet?.getCell('G4').value).toBe('Present');
    expect(selfMarkedSheet?.getCell('J4').value).toBe('Self marked');
    expect(selfMarkedSheet?.getCell('M4').value).toBe('09:00:00');
    expect(selfMarkedSheet?.getCell('N4').value).toBe('18:30:00');
    expect(selfMarkedSheet?.getCell('O4').value).toBe('09:00');

    const hrMarkedSheet = workbook.getWorksheet('24-Jul');
    expect(hrMarkedSheet?.getCell('J4').value).toBe('Marked by HR');

    const derivedSheet = workbook.getWorksheet('06-Jul');
    expect(derivedSheet?.getCell('G4').value).toBe('Absent');
    expect(derivedSheet?.getCell('J4').value).toBe('System derived');
  });
});

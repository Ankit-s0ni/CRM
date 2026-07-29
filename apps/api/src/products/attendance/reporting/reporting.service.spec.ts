import { ReportFormat, ReportType } from '@prisma/client';
import { ReportingService } from './reporting.service';

describe('ReportingService', () => {
  it('always creates detailed attendance as the working-day XLSX contract', async () => {
    const createdReport = {
      id: 'report-1',
      tenantId: 'tenant-1',
      requestedBy: 'user-1',
      reportType: ReportType.MUSTER,
      period: '2026-07',
      format: ReportFormat.XLSX,
      contractVersion: 3,
    };
    const reportExport = {
      create: jest.fn().mockResolvedValue(createdReport),
      findUnique: jest.fn().mockResolvedValue(createdReport),
    };
    const prisma = {
      forTenant: jest.fn(
        (
          callback: (client: { reportExport: typeof reportExport }) => unknown,
        ) => callback({ reportExport }),
      ),
    };
    const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const service = new ReportingService(
      prisma as never,
      { tenantId: 'tenant-1', userId: 'user-1' } as never,
      queue as never,
      {} as never,
    );

    await service.create(ReportType.MUSTER, {
      period: '2026-07',
      format: ReportFormat.CSV,
    });

    expect(reportExport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        format: ReportFormat.XLSX,
        contractVersion: 3,
      }),
    });
    expect(queue.enqueue).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      reportId: 'report-1',
    });
  });
});

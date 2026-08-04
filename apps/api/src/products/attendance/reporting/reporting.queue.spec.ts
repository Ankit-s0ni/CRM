import { ReportingQueue } from './reporting.queue';

describe('ReportingQueue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('processes reports inline by default outside production', async () => {
    delete process.env.NODE_ENV;
    delete process.env.REPORT_QUEUE_MODE;
    const processor = { process: jest.fn().mockResolvedValue({ id: 'report-1' }) };
    const queue = new ReportingQueue(processor as never);

    queue.onModuleInit();
    await queue.enqueue({ tenantId: 'tenant-1', reportId: 'report-1' });

    expect(processor.process).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      reportId: 'report-1',
    });
  });
});

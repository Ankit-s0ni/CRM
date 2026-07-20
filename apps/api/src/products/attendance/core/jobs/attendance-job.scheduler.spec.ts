import { AttendanceJobQueue } from './attendance-job.queue';
import { AttendanceJobScheduler } from './attendance-job.scheduler';

describe('AttendanceJobScheduler', () => {
  const queue = {
    enqueueTenant: jest.fn().mockResolvedValue(undefined),
    enqueuePartitions: jest.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    forAdmin: jest.fn(),
  };
  const scheduler = new AttendanceJobScheduler(
    prisma as never,
    queue as unknown as AttendanceJobQueue,
  );

  beforeEach(() => jest.clearAllMocks());

  it('dispatches tenant-local finalization and absentee jobs', async () => {
    prisma.forAdmin.mockResolvedValue([
      {
        id: 'tenant-dubai',
        settings: { timezone: 'Asia/Dubai', absenteeAlertTime: '10:00' },
      },
    ]);

    await scheduler.dispatch(new Date('2026-07-17T08:30:00.000Z'));

    expect(queue.enqueueTenant).toHaveBeenCalledWith(
      'finalize-day',
      'tenant-dubai',
      '2026-07-16',
    );
    expect(queue.enqueueTenant).toHaveBeenCalledWith(
      'absentee-sweep',
      'tenant-dubai',
      '2026-07-17',
    );
  });

  it('waits until the configured local cutoffs', async () => {
    prisma.forAdmin.mockResolvedValue([
      {
        id: 'tenant-new-york',
        settings: {
          timezone: 'America/New_York',
          absenteeAlertTime: '10:00',
        },
      },
    ]);

    await scheduler.dispatch(new Date('2026-07-17T04:30:00.000Z'));

    expect(queue.enqueueTenant).not.toHaveBeenCalled();
  });

  it('uses UTC as a safe tenant fallback', async () => {
    prisma.forAdmin.mockResolvedValue([
      { id: 'tenant-default', settings: null },
    ]);

    await scheduler.dispatch(new Date('2026-07-17T11:00:00.000Z'));

    expect(queue.enqueueTenant).toHaveBeenCalledWith(
      'finalize-day',
      'tenant-default',
      '2026-07-16',
    );
    expect(queue.enqueueTenant).toHaveBeenCalledWith(
      'absentee-sweep',
      'tenant-default',
      '2026-07-17',
    );
  });

  it('requests two future partitions near the month boundary', async () => {
    prisma.forAdmin.mockResolvedValue([]);

    await scheduler.dispatch(new Date('2026-07-25T00:00:00.000Z'));

    expect(queue.enqueuePartitions).toHaveBeenCalledWith('2026-07');
  });
});

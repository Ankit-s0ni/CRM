import type { Job } from 'bullmq';
import type { PrivateEvidenceStorageService } from './private-evidence-storage.service';
import {
  PrivateEvidenceDeletionTask,
  PrivateEvidenceDeletionWorker,
} from './private-evidence-deletion.worker';

describe('PrivateEvidenceDeletionWorker', () => {
  it('deletes every tenant-owned key and remains safe to retry', async () => {
    const deleteEnrollmentObject = jest.fn().mockResolvedValue(undefined);
    const worker = new PrivateEvidenceDeletionWorker({
      deleteEnrollmentObject,
    } as unknown as PrivateEvidenceStorageService);
    const job = {
      data: {
        eventId: 'event-1',
        tenantId: 'tenant-1',
        payload: {
          employeeId: 'employee-1',
          objectKeys: ['private/tenant-1/biometrics/employee-1/a.jpg'],
        },
      },
    } as Pick<Job<PrivateEvidenceDeletionTask>, 'data'>;

    await expect(worker.process(job)).resolves.toEqual({ deleted: 1 });
    await expect(worker.process(job)).resolves.toEqual({ deleted: 1 });
    expect(deleteEnrollmentObject).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed jobs so BullMQ retains them as failed', async () => {
    const worker = new PrivateEvidenceDeletionWorker(
      {} as PrivateEvidenceStorageService,
    );
    const job = {
      data: { eventId: 'event-1', tenantId: null, payload: {} },
    } as Pick<Job<PrivateEvidenceDeletionTask>, 'data'>;

    await expect(worker.process(job)).rejects.toThrow(
      'EVIDENCE_DELETION_PAYLOAD_INVALID',
    );
  });
});

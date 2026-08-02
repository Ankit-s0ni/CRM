import { BadRequestException } from '@nestjs/common';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';

describe('WorkspaceOnboardingService', () => {
  const tenantId = '019a0000-0000-7000-8000-000000000001';

  it('reports the earliest required incomplete step', async () => {
    const { service } = setup({ departments: 0, designations: 0, offices: 0 });

    await expect(service.status()).resolves.toMatchObject({
      data: {
        completed: false,
        currentStep: 2,
        steps: { organization: false, office: false },
        missingSteps: ['organization', 'office'],
      },
    });
  });

  it('rejects direct completion while required setup is missing', async () => {
    const { service, tx } = setup({
      departments: 1,
      designations: 1,
      offices: 0,
    });

    const completion = service.complete({});
    await expect(completion).rejects.toBeInstanceOf(BadRequestException);
    await expect(completion).rejects.toMatchObject({
      response: {
        code: 'ONBOARDING_INCOMPLETE',
        details: { missingSteps: ['office'] },
      },
    });
    expect(tx.tenant.updateMany).not.toHaveBeenCalled();
  });

  it('completes once and records authoritative completed steps', async () => {
    const { service, tx, audit, outbox } = setup({
      departments: 1,
      designations: 1,
      offices: 1,
    });

    await expect(
      service.complete({ progress: { clientStep: 6 } }),
    ).resolves.toMatchObject({
      data: { completed: true },
    });
    expect(tx.tenant.updateMany).toHaveBeenCalledWith({
      where: { id: tenantId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: expect.any(Date) as Date },
    });
    expect(audit.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'workspace.onboarding.completed',
        newValue: expect.objectContaining({
          completedSteps: [
            'company',
            'organization',
            'office',
            'workingDays',
            'attendancePolicy',
            'hrInvite',
          ],
        }) as unknown,
      }),
    );
    expect(outbox.append).toHaveBeenCalledTimes(1);
  });

  it('keeps an existing completed tenant idempotently completed', async () => {
    const completedAt = new Date('2026-07-01T00:00:00.000Z');
    const { service, tx, audit } = setup({
      completedAt,
      departments: 0,
      designations: 0,
      offices: 0,
    });

    await expect(service.complete({})).resolves.toEqual({
      data: { completed: true, completedAt },
    });
    expect(tx.tenant.updateMany).not.toHaveBeenCalled();
    expect(audit.append).not.toHaveBeenCalled();
  });

  it('does not reopen a completed legacy tenant in status', async () => {
    const { service } = setup({
      completedAt: new Date('2026-07-01T00:00:00.000Z'),
      departments: 0,
      designations: 0,
      offices: 0,
    });

    await expect(service.status()).resolves.toMatchObject({
      data: {
        completed: true,
        currentStep: 6,
        missingSteps: [],
        steps: { organization: false, office: false },
      },
    });
  });

  it('returns the winning completion without duplicate side effects during a race', async () => {
    const winningCompletedAt = new Date('2026-07-02T00:00:00.000Z');
    const { service, tx, audit, outbox } = setup({
      departments: 1,
      designations: 1,
      offices: 1,
      completionCount: 0,
      completedAfterRace: winningCompletedAt,
    });

    await expect(service.complete({})).resolves.toEqual({
      data: { completed: true, completedAt: winningCompletedAt },
    });
    expect(audit.append).not.toHaveBeenCalled();
    expect(outbox.append).not.toHaveBeenCalled();
    expect(tx.tenant.findUnique).toHaveBeenCalledTimes(2);
  });

  function setup({
    completedAt = null,
    departments,
    designations,
    offices,
    completionCount = 1,
    completedAfterRace = null,
  }: {
    completedAt?: Date | null;
    departments: number;
    designations: number;
    offices: number;
    completionCount?: number;
    completedAfterRace?: Date | null;
  }) {
    let tenantReadCount = 0;
    const tx = {
      tenant: {
        findUnique: jest.fn().mockImplementation(() => {
          tenantReadCount += 1;
          return Promise.resolve({
            onboardingCompletedAt:
              tenantReadCount === 1 ? completedAt : completedAfterRace,
          });
        }),
        updateMany: jest.fn().mockResolvedValue({ count: completionCount }),
      },
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({
          timezone: 'Asia/Muscat',
          locale: 'en',
          weeklyOffs: ['FRI', 'SAT'],
          workingDayStart: '09:00',
          workingDayEnd: '18:00',
          faceMatchThreshold: 85,
          fieldTrackingIntervalMin: 15,
          checkoutReminderMinutes: 15,
          absenteeAlertTime: '10:00',
          onboardingStep: 4,
          onboardingVersion: 1,
        }),
      },
      department: { count: jest.fn().mockResolvedValue(departments) },
      designation: { count: jest.fn().mockResolvedValue(designations) },
      officeLocation: { count: jest.fn().mockResolvedValue(offices) },
    };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const outbox = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new WorkspaceOnboardingService(
      {
        forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      } as never,
      { tenantId } as never,
      audit as never,
      outbox,
    );
    return { service, tx, audit, outbox };
  }
});

import { UnprocessableEntityException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { WorkspaceSettingsService } from './workspace-settings.service';

describe('WorkspaceSettingsService onboarding', () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const user: AuthenticatedUser = {
    tenantId,
    userId: '22222222-2222-4222-8222-222222222222',
    email: 'admin@acme.test',
    roles: ['BUSINESS_ADMIN'],
  };
  const settings = {
    tenantId,
    timezone: 'Asia/Kolkata',
    locale: 'en',
    weeklyOffs: ['SUN'],
    workingDayStart: '09:00',
    workingDayEnd: '18:00',
    onboardingStep: 6,
    onboardingVersion: 2,
  };
  type TenantUpdateInput = {
    where: { id: string };
    data: { onboardingCompletedAt: Date };
  };
  const tx = {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn<Promise<unknown>, [TenantUpdateInput]>(),
    },
    tenantSettings: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma = {
    forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const audit = { append: jest.fn() };
  const outbox = { append: jest.fn() };
  const productReadiness = {
    getSetupHealth: jest.fn(),
  };
  const service = new WorkspaceSettingsService(
    prisma as never,
    { tenantId } as never,
    audit as never,
    outbox,
    {} as never,
    productReadiness,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEPLOYMENT_ENVIRONMENT = 'test';
    tx.tenant.findUnique.mockResolvedValue({
      id: tenantId,
      companyName: 'Acme Logistics',
      onboardingCompletedAt: null,
    });
    tx.tenantSettings.findUnique.mockResolvedValue(settings);
    tx.tenant.update.mockResolvedValue({});
    tx.tenantSettings.update.mockResolvedValue({});
    audit.append.mockResolvedValue({});
    outbox.append.mockResolvedValue({});
  });

  function mockHrmsHealth(input: {
    organizationReady: boolean;
    offices: number;
  }) {
    productReadiness.getSetupHealth.mockResolvedValue({
      categories: [
        {
          key: 'ORGANIZATION',
          status: input.organizationReady ? 'READY' : 'NEEDS_SETUP',
          configuration: { departments: 1, designations: 1 },
        },
        {
          key: 'ATTENDANCE',
          status: input.offices ? 'READY' : 'NEEDS_SETUP',
          configuration: { offices: input.offices },
        },
      ],
    });
  }

  it('merges Platform progress with tenant-scoped HRMS readiness', async () => {
    mockHrmsHealth({ organizationReady: false, offices: 0 });

    const result = await service.onboardingStatus(user);

    expect(tx.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: tenantId },
      select: {
        id: true,
        companyName: true,
        onboardingCompletedAt: true,
      },
    });
    expect(productReadiness.getSetupHealth).toHaveBeenCalledWith(user, 'HRMS');
    expect(result.data).toMatchObject({
      completed: false,
      currentStep: 2,
      missingSteps: ['organization', 'office'],
      steps: {
        company: true,
        organization: false,
        office: false,
        workingDays: true,
        attendancePolicy: true,
        hrInvite: true,
      },
    });
  });

  it('keeps a newly created workspace on its saved first step', async () => {
    mockHrmsHealth({ organizationReady: false, offices: 0 });
    tx.tenantSettings.findUnique.mockResolvedValue({
      ...settings,
      onboardingStep: 1,
    });

    const result = await service.onboardingStatus(user);

    expect(result.data.currentStep).toBe(1);
  });

  it('rejects direct completion when authoritative setup is incomplete', async () => {
    mockHrmsHealth({ organizationReady: true, offices: 0 });

    try {
      await service.completeOnboarding(user, {
        progress: { completedSteps: 6 },
      });
      throw new Error('Expected incomplete onboarding to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).getResponse()).toEqual(
        expect.objectContaining({
          code: 'ONBOARDING_INCOMPLETE',
          details: { missingSteps: ['office'] },
        }),
      );
    }
    expect(tx.tenant.update).not.toHaveBeenCalled();
  });

  it('moves an otherwise ready incomplete workspace to the final step', async () => {
    mockHrmsHealth({ organizationReady: true, offices: 1 });

    const result = await service.onboardingStatus(user);

    expect(result.data).toMatchObject({
      completed: false,
      currentStep: 6,
      missingSteps: [],
    });
  });

  it('completes once, with audit and outbox evidence, when setup is ready', async () => {
    mockHrmsHealth({ organizationReady: true, offices: 1 });
    tx.tenant.findUnique
      .mockResolvedValueOnce({
        id: tenantId,
        companyName: 'Acme Logistics',
        onboardingCompletedAt: null,
      })
      .mockResolvedValueOnce({ onboardingCompletedAt: null });

    const result = await service.completeOnboarding(user, {
      progress: { completedSteps: 6 },
    });

    expect(tx.tenant.update).toHaveBeenCalledTimes(1);
    expect(tx.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: tenantId } }),
    );
    expect(tx.tenantSettings.update).toHaveBeenCalledWith({
      where: { tenantId },
      data: { onboardingStep: 6, onboardingVersion: 2 },
    });
    expect(audit.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId,
        actorUserId: user.userId,
        action: 'workspace.onboarding.completed',
      }),
    );
    expect(outbox.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId,
        eventKey: 'tenant.onboarding.completed.v1',
      }),
    );
    expect(result.data).toMatchObject({ completed: true, idempotent: false });
  });
});

import {
  isHrmsModuleActive,
  resolveHrmsProvisioningStatus,
  resolveHrmsLifecycleTransition,
} from './product-lifecycle';

describe('HRMS lifecycle transition', () => {
  it.each([[['ATTENDANCE']], [['PAYROLL']], [['ATTENDANCE', 'PAYROLL']]])(
    'treats %j as one HRMS product',
    (moduleKeys: string[]) => {
      expect(isHrmsModuleActive(moduleKeys)).toBe(true);
    },
  );

  it('publishes activation only on the inactive to active edge', () => {
    expect(resolveHrmsLifecycleTransition([], ['ATTENDANCE'])).toBe(
      'platform.product.activation-requested.v1',
    );
    expect(
      resolveHrmsLifecycleTransition(['ATTENDANCE'], ['PAYROLL']),
    ).toBeNull();
  });

  it('publishes suspension only when the final HRMS module is removed', () => {
    expect(
      resolveHrmsLifecycleTransition(['ATTENDANCE', 'PAYROLL'], ['PAYROLL']),
    ).toBeNull();
    expect(resolveHrmsLifecycleTransition(['PAYROLL'], [])).toBe(
      'platform.product.suspension-requested.v1',
    );
  });
});

describe('HRMS provisioning status', () => {
  const effectiveAt = '2026-08-05T00:00:00.000Z';
  const delivery = {
    eventKey: 'platform.product.activation-requested.v1' as const,
    createdAt: new Date('2026-08-05T00:01:00.000Z'),
    publishedAt: null,
    lockedAt: null,
    attemptCount: 0,
    lastError: null,
    deadLetteredAt: null,
  };

  it('reports pending before an activation event is claimed', () => {
    expect(
      resolveHrmsProvisioningStatus({
        productActive: true,
        subscriptionStatus: 'ACTIVE',
        effectiveAt,
        delivery,
      }),
    ).toMatchObject({ state: 'PENDING', attempt: 0 });
  });

  it('reports retry progress without exposing the delivery error', () => {
    expect(
      resolveHrmsProvisioningStatus({
        productActive: true,
        subscriptionStatus: 'ACTIVE',
        effectiveAt,
        delivery: {
          ...delivery,
          attemptCount: 2,
          lastError: 'secret transport details',
        },
      }),
    ).toEqual({
      state: 'PROVISIONING',
      attempt: 2,
      updatedAt: '2026-08-05T00:01:00.000Z',
    });
  });

  it('reports a stable failure code for a dead-lettered event', () => {
    expect(
      resolveHrmsProvisioningStatus({
        productActive: true,
        subscriptionStatus: 'ACTIVE',
        effectiveAt,
        delivery: {
          ...delivery,
          attemptCount: 5,
          lastError: 'credentials must never leak',
          deadLetteredAt: new Date('2026-08-05T00:05:00.000Z'),
        },
      }),
    ).toEqual({
      state: 'FAILED',
      attempt: 5,
      updatedAt: '2026-08-05T00:05:00.000Z',
      failureCode: 'LIFECYCLE_EVENT_DELIVERY_FAILED',
    });
  });

  it('converges published activation and suspension events', () => {
    const publishedAt = new Date('2026-08-05T00:03:00.000Z');
    expect(
      resolveHrmsProvisioningStatus({
        productActive: true,
        subscriptionStatus: 'ACTIVE',
        effectiveAt,
        delivery: { ...delivery, publishedAt },
      }).state,
    ).toBe('ACTIVE');
    expect(
      resolveHrmsProvisioningStatus({
        productActive: false,
        subscriptionStatus: 'ACTIVE',
        effectiveAt,
        delivery: {
          ...delivery,
          eventKey: 'platform.product.suspension-requested.v1',
          publishedAt,
        },
      }).state,
    ).toBe('SUSPENDED');
  });
});

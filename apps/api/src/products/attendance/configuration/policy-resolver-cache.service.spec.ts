import { PolicyResolverCache } from './policy-resolver-cache.service';

describe('PolicyResolverCache', () => {
  it('isolates tenant values and invalidates only the changed tenant', async () => {
    const cache = new PolicyResolverCache();
    const tenantA = await cache.get('tenant-a', 'employee-1', '2026-07-20');
    const tenantB = await cache.get('tenant-b', 'employee-1', '2026-07-20');

    await cache.set(
      'tenant-a',
      'employee-1',
      '2026-07-20',
      tenantA.generation,
      { policy: 'A' },
    );
    await cache.set(
      'tenant-b',
      'employee-1',
      '2026-07-20',
      tenantB.generation,
      { policy: 'B' },
    );
    await cache.invalidate('tenant-a');

    expect(
      (await cache.get('tenant-a', 'employee-1', '2026-07-20')).value,
    ).toBeUndefined();
    expect(
      (await cache.get('tenant-b', 'employee-1', '2026-07-20')).value,
    ).toEqual({ policy: 'B' });
  });

  it('does not expose a stale write completed after invalidation', async () => {
    const cache = new PolicyResolverCache();
    const lookup = await cache.get('tenant-a', 'employee-1', '2026-07-20');

    await cache.invalidate('tenant-a');
    await cache.set('tenant-a', 'employee-1', '2026-07-20', lookup.generation, {
      policy: 'stale',
    });

    expect(
      (await cache.get('tenant-a', 'employee-1', '2026-07-20')).value,
    ).toBeUndefined();
  });
});

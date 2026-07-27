import { EffectivePayrollPolicyResolver } from './effective-payroll-policy.resolver';
import type { PayrollFoundationRepository } from '../ports/payroll-foundation.repository';

describe('EffectivePayrollPolicyResolver', () => {
  it('selects a pay-group override over organization settings with source evidence', async () => {
    const resolver = new EffectivePayrollPolicyResolver(
      repo({
        payGroup: {
          id: 'pay-group-1',
          version: 3,
          prorationPolicyOverride: { method: 'calendar-days' },
          roundingPolicyOverride: null,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: null,
        },
      }),
    );

    const result = await resolver.resolve({
      tenantId: 'tenant-a',
      employeeId: 'employee-a',
      payGroupId: 'pay-group-1',
      policyType: 'PRORATION',
      effectiveDate: '2026-07-01',
    });

    expect(result.sourceLevel).toBe('PAY_GROUP');
    expect(result.resolvedValue).toEqual({ method: 'calendar-days' });
    expect(result.wasOverridden).toBe(true);
    expect(result.overridePath).toEqual(['ORGANIZATION', 'PAY_GROUP']);
  });

  it('uses an active policy version and returns policy/version identifiers', async () => {
    const resolver = new EffectivePayrollPolicyResolver(
      repo({
        policyVersions: [
          {
            id: 'version-1',
            policyId: 'policy-1',
            version: 2,
            sourceLevel: 'ORGANIZATION',
            sourceEntityId: null,
            config: { schemaVersion: 'proration-v1', method: 'working-days' },
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
            effectiveTo: null,
            policy: { id: 'policy-1' },
          },
        ],
      }),
    );

    const result = await resolver.resolve({
      tenantId: 'tenant-a',
      employeeId: 'employee-a',
      policyType: 'PRORATION',
      effectiveDate: '2026-07-01',
    });

    expect(result.policyId).toBe('policy-1');
    expect(result.policyVersionId).toBe('version-1');
    expect(result.schemaVersion).toBe('proration-v1');
    expect(result.sourceLevel).toBe('ORGANIZATION');
  });

  it('selects employee override over pay-group and organization candidates', async () => {
    const resolver = new EffectivePayrollPolicyResolver(
      repo({
        employeeMetadata: {
          PRORATION: { method: 'employee-specific' },
        },
        payGroup: {
          id: 'pay-group-1',
          version: 3,
          prorationPolicyOverride: { method: 'calendar-days' },
          roundingPolicyOverride: null,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: null,
        },
      }),
    );

    const result = await resolver.resolve({
      tenantId: 'tenant-a',
      employeeId: 'employee-a',
      payGroupId: 'pay-group-1',
      policyType: 'PRORATION',
      effectiveDate: '2026-07-01',
    });

    expect(result.sourceLevel).toBe('EMPLOYEE');
    expect(result.sourceEntityId).toBe('profile-1');
    expect(result.resolvedValue).toEqual({ method: 'employee-specific' });
    expect(result.overridePath).toEqual([
      'ORGANIZATION',
      'PAY_GROUP',
      'EMPLOYEE',
    ]);
  });

  it('honors effective dating for policy versions', async () => {
    const resolver = new EffectivePayrollPolicyResolver(
      repo({
        policyVersions: [
          {
            id: 'future-version',
            policyId: 'policy-1',
            version: 1,
            sourceLevel: 'ORGANIZATION',
            sourceEntityId: null,
            config: { schemaVersion: 'proration-v2', method: 'future' },
            effectiveFrom: new Date('2026-08-01T00:00:00.000Z'),
            effectiveTo: null,
            policy: { id: 'policy-1' },
          },
        ],
      }),
    );

    const before = await resolver.resolve({
      tenantId: 'tenant-a',
      employeeId: 'employee-a',
      policyType: 'PRORATION',
      effectiveDate: '2026-07-31',
    });
    const after = await resolver.resolve({
      tenantId: 'tenant-a',
      employeeId: 'employee-a',
      policyType: 'PRORATION',
      effectiveDate: '2026-08-01',
    });

    expect(before.sourceEntityId).toBe('settings-1');
    expect(before.resolvedValue).toEqual({ method: 'fixed-days' });
    expect(after.policyVersionId).toBe('future-version');
    expect(after.resolvedValue).toEqual({
      schemaVersion: 'proration-v2',
      method: 'future',
    });
  });

  it('is deterministic and scopes policy lookups to the requested tenant', async () => {
    const listPayrollPolicyVersions = jest.fn().mockResolvedValue([
      {
        id: 'version-1',
        policyId: 'policy-1',
        version: 1,
        sourceLevel: 'ORGANIZATION',
        sourceEntityId: null,
        config: { schemaVersion: 'proration-v1', method: 'working-days' },
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
        policy: { id: 'policy-1' },
      },
    ]);
    const repository = repo({
      listPayrollPolicyVersions,
    });
    const resolver = new EffectivePayrollPolicyResolver(repository);

    const first = await resolver.resolve({
      tenantId: 'tenant-a',
      employeeId: 'employee-a',
      policyType: 'PRORATION',
      effectiveDate: '2026-07-01',
    });
    const second = await resolver.resolve({
      tenantId: 'tenant-a',
      employeeId: 'employee-a',
      policyType: 'PRORATION',
      effectiveDate: '2026-07-01',
    });

    expect(first).toEqual(second);
    expect(mockCalls(listPayrollPolicyVersions)).toContainEqual([
      'tenant-a',
      'PRORATION',
    ]);
  });
});

function repo(overrides: {
  payGroup?: Record<string, unknown> | null;
  policyVersions?: Array<Record<string, unknown>>;
  employeeMetadata?: Record<string, unknown>;
  listPayrollPolicyVersions?: unknown;
}): PayrollFoundationRepository {
  return {
    getSettings: jest.fn().mockResolvedValue({
      id: 'settings-1',
      version: 1,
      defaultProrationPolicy: { method: 'fixed-days' },
      defaultRoundingPolicy: {},
      workingDayBasis: 'CALENDAR_DAYS',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      effectiveTo: null,
    }),
    getEmployeePayrollProfile: jest.fn().mockResolvedValue({
      id: 'profile-1',
      payGroupId: overrides.payGroup ? 'pay-group-1' : null,
      version: 1,
      metadata: overrides.employeeMetadata ?? {},
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      effectiveTo: null,
    }),
    findPayGroup: jest.fn().mockResolvedValue(overrides.payGroup ?? null),
    listPayrollPolicyVersions:
      overrides.listPayrollPolicyVersions ??
      jest.fn().mockResolvedValue(overrides.policyVersions ?? []),
  } as unknown as PayrollFoundationRepository;
}

function mockCalls(value: unknown) {
  return (value as jest.Mock).mock.calls as unknown[][];
}

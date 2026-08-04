import { Inject, Injectable } from '@nestjs/common';
import { PAYROLL_FOUNDATION_REPOSITORY } from '../ports/payroll-foundation.repository';
import type { PayrollFoundationRepository } from '../ports/payroll-foundation.repository';

type PolicyCandidate = {
  sourceLevel:
    | 'COUNTRY_DEFAULT'
    | 'ORGANIZATION'
    | 'PAY_GROUP'
    | 'SALARY_STRUCTURE'
    | 'EMPLOYEE';
  sourceEntityId: string | null;
  policyId: string | null;
  policyVersionId: string | null;
  version: number;
  resolvedValue: unknown;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  schemaVersion: string;
};

export type EffectivePolicyResolution = {
  policyType: string;
  effectiveDate: string;
  resolvedValue: unknown;
  sourceLevel: string;
  sourceEntityId: string | null;
  policyId: string | null;
  policyVersionId: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  wasOverridden: boolean;
  overridePath: string[];
  schemaVersion: string;
  candidates: Array<{
    sourceLevel: string;
    sourceEntityId: string | null;
    policyId: string | null;
    policyVersionId: string | null;
    version: number;
    resolvedValue: unknown;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    schemaVersion: string;
    selected: boolean;
  }>;
};

@Injectable()
export class EffectivePayrollPolicyResolver {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async resolve(input: {
    tenantId: string;
    employeeId: string;
    payGroupId?: string;
    policyType: string;
    effectiveDate: string;
  }): Promise<EffectivePolicyResolution> {
    const profile = await this.repo.getEmployeePayrollProfile(
      input.tenantId,
      input.employeeId,
    );
    const settings = await this.repo.getSettings(input.tenantId);
    const payGroupId = input.payGroupId ?? profile?.payGroupId ?? undefined;
    const payGroup = payGroupId
      ? await this.repo.findPayGroup(input.tenantId, payGroupId)
      : null;
    const effectiveDate = parseDate(input.effectiveDate);
    const candidates: PolicyCandidate[] = [];
    if (settings) {
      candidates.push({
        sourceLevel: 'ORGANIZATION',
        sourceEntityId: settings.id,
        policyId: null,
        policyVersionId: null,
        version: settings.version,
        resolvedValue: organizationValue(settings, input.policyType),
        effectiveFrom: dateOnly(settings.effectiveFrom),
        effectiveTo: settings.effectiveTo
          ? dateOnly(settings.effectiveTo)
          : null,
        schemaVersion: 'settings-v1',
      });
    }
    const policyVersions = await this.repo.listPayrollPolicyVersions(
      input.tenantId,
      input.policyType,
    );
    for (const version of policyVersions.filter((item) =>
      containsDate(item, effectiveDate),
    )) {
      candidates.push({
        sourceLevel: version.sourceLevel,
        sourceEntityId: version.sourceEntityId,
        policyId: version.policyId,
        policyVersionId: version.id,
        version: version.version,
        resolvedValue: version.config,
        effectiveFrom: dateOnly(version.effectiveFrom),
        effectiveTo: version.effectiveTo ? dateOnly(version.effectiveTo) : null,
        schemaVersion: schemaVersion(version.config),
      });
    }
    if (payGroup) {
      candidates.push({
        sourceLevel: 'PAY_GROUP',
        sourceEntityId: payGroup.id,
        policyId: null,
        policyVersionId: null,
        version: payGroup.version,
        resolvedValue: payGroupValue(payGroup, input.policyType),
        effectiveFrom: dateOnly(payGroup.effectiveFrom),
        effectiveTo: payGroup.effectiveTo
          ? dateOnly(payGroup.effectiveTo)
          : null,
        schemaVersion: 'pay-group-override-v1',
      });
    }
    if (profile?.metadata && typeof profile.metadata === 'object') {
      const metadata = profile.metadata as Record<string, unknown>;
      if (input.policyType in metadata) {
        candidates.push({
          sourceLevel: 'EMPLOYEE',
          sourceEntityId: profile.id,
          policyId: null,
          policyVersionId: null,
          version: profile.version,
          resolvedValue: metadata[input.policyType],
          effectiveFrom: dateOnly(profile.effectiveFrom),
          effectiveTo: profile.effectiveTo
            ? dateOnly(profile.effectiveTo)
            : null,
          schemaVersion: 'employee-override-v1',
        });
      }
    }
    const selected =
      candidates
        .filter((candidate) => candidate.resolvedValue !== null)
        .sort(
          (left, right) => selectionPriority(right) - selectionPriority(left),
        )
        .find((candidate) => candidate.resolvedValue !== null) ?? candidates[0];
    if (!selected) {
      return {
        policyType: input.policyType,
        effectiveDate: input.effectiveDate,
        resolvedValue: null,
        sourceLevel: 'ORGANIZATION',
        sourceEntityId: null,
        policyId: null,
        policyVersionId: null,
        effectiveFrom: null,
        effectiveTo: null,
        wasOverridden: false,
        overridePath: [],
        schemaVersion: 'missing',
        candidates: [],
      };
    }
    const overridePath = candidates
      .filter((candidate) => candidate.resolvedValue !== null)
      .sort((left, right) => selectionPriority(left) - selectionPriority(right))
      .map((candidate) => candidate.sourceLevel);
    return {
      policyType: input.policyType,
      effectiveDate: input.effectiveDate,
      resolvedValue: selected.resolvedValue,
      sourceLevel: selected.sourceLevel,
      sourceEntityId: selected.sourceEntityId,
      policyId: selected.policyId,
      policyVersionId: selected.policyVersionId,
      effectiveFrom: selected.effectiveFrom,
      effectiveTo: selected.effectiveTo,
      wasOverridden: overridePath.length > 1,
      overridePath,
      schemaVersion: selected.schemaVersion,
      candidates: candidates.map((candidate) => ({
        ...candidate,
        selected: candidate === selected,
      })),
    };
  }
}

function parseDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function containsDate(
  value: { effectiveFrom: Date; effectiveTo: Date | null },
  date: Date,
) {
  return (
    value.effectiveFrom <= date &&
    (!value.effectiveTo || value.effectiveTo >= date)
  );
}

function precedence(value: { sourceLevel: string }) {
  return (
    {
      COUNTRY_DEFAULT: 0,
      ORGANIZATION: 1,
      PAY_GROUP: 2,
      SALARY_STRUCTURE: 3,
      EMPLOYEE: 4,
    }[value.sourceLevel] ?? 0
  );
}

function selectionPriority(value: {
  sourceLevel: string;
  policyVersionId?: string | null;
}) {
  return precedence(value) * 10 + (value.policyVersionId ? 1 : 0);
}

function schemaVersion(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const candidate = (value as Record<string, unknown>).schemaVersion;
    if (typeof candidate === 'string') return candidate;
  }
  return 'v1';
}

function organizationValue(
  settings: {
    defaultProrationPolicy: unknown;
    defaultRoundingPolicy: unknown;
    workingDayBasis: string;
  },
  policyType: string,
) {
  if (policyType === 'PRORATION') return settings.defaultProrationPolicy;
  if (policyType === 'ROUNDING') return settings.defaultRoundingPolicy;
  if (policyType === 'WORKING_DAY_BASIS') return settings.workingDayBasis;
  return null;
}

function payGroupValue(
  payGroup: {
    prorationPolicyOverride: unknown;
    roundingPolicyOverride: unknown;
  },
  policyType: string,
) {
  if (policyType === 'PRORATION')
    return payGroup.prorationPolicyOverride ?? null;
  if (policyType === 'ROUNDING') return payGroup.roundingPolicyOverride ?? null;
  return null;
}

import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PAYROLL_FOUNDATION_REPOSITORY } from '../ports/payroll-foundation.repository';
import type { PayrollFoundationRepository } from '../ports/payroll-foundation.repository';
import { EffectivePayrollPolicyResolver } from '../services/effective-payroll-policy.resolver';
import {
  GetEffectivePayrollPolicyQuery,
  GetEmployeeCompensationHistoryQuery,
  GetEmployeeEffectiveCompensationQuery,
  GetEmployeePayrollProfileQuery,
  GetPayComponentQuery,
  GetPayComponentVersionHistoryQuery,
  GetPayGroupQuery,
  GetPayrollSettingsQuery,
  GetSalaryStructureQuery,
  GetSalaryStructureVersionHistoryQuery,
  ListPayComponentsQuery,
  ListPayGroupEmployeesQuery,
  ListPayGroupsQuery,
  ListSalaryStructuresQuery,
} from '../queries/payroll-foundation.queries';

@QueryHandler(GetPayrollSettingsQuery)
export class GetPayrollSettingsHandler implements IQueryHandler<GetPayrollSettingsQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: GetPayrollSettingsQuery) {
    const settings = await this.repo.getSettings(query.tenantId);
    if (!settings) notFound('PAYROLL_SETTINGS_NOT_FOUND', 'Payroll settings');
    return { data: settings };
  }
}

@QueryHandler(ListPayGroupsQuery)
export class ListPayGroupsHandler implements IQueryHandler<ListPayGroupsQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: ListPayGroupsQuery) {
    return { data: await this.repo.listPayGroups(query.tenantId) };
  }
}

@QueryHandler(GetPayGroupQuery)
export class GetPayGroupHandler implements IQueryHandler<GetPayGroupQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: GetPayGroupQuery) {
    const item = await this.repo.findPayGroup(query.tenantId, query.id);
    if (!item) notFound('PAY_GROUP_NOT_FOUND', 'Pay group');
    return { data: item };
  }
}

@QueryHandler(ListPayGroupEmployeesQuery)
export class ListPayGroupEmployeesHandler implements IQueryHandler<ListPayGroupEmployeesQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: ListPayGroupEmployeesQuery) {
    const payGroup = await this.repo.findPayGroup(
      query.tenantId,
      query.payGroupId,
    );
    if (!payGroup) notFound('PAY_GROUP_NOT_FOUND', 'Pay group');
    return {
      data: await this.repo.listPayGroupEmployees(
        query.tenantId,
        query.payGroupId,
      ),
    };
  }
}

@QueryHandler(ListPayComponentsQuery)
export class ListPayComponentsHandler implements IQueryHandler<ListPayComponentsQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: ListPayComponentsQuery) {
    return { data: await this.repo.listPayComponents(query.tenantId) };
  }
}

@QueryHandler(GetPayComponentQuery)
export class GetPayComponentHandler implements IQueryHandler<GetPayComponentQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: GetPayComponentQuery) {
    const item = await this.repo.findPayComponent(query.tenantId, query.id);
    if (!item) notFound('PAY_COMPONENT_NOT_FOUND', 'Pay component');
    return {
      data: {
        ...item,
        versions: await this.repo.listPayComponentVersions(
          query.tenantId,
          item.id,
        ),
      },
    };
  }
}

@QueryHandler(GetPayComponentVersionHistoryQuery)
export class GetPayComponentVersionHistoryHandler implements IQueryHandler<GetPayComponentVersionHistoryQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: GetPayComponentVersionHistoryQuery) {
    const item = await this.repo.findPayComponent(
      query.tenantId,
      query.componentId,
    );
    if (!item) notFound('PAY_COMPONENT_NOT_FOUND', 'Pay component');
    return {
      data: await this.repo.listPayComponentVersions(
        query.tenantId,
        query.componentId,
      ),
    };
  }
}

@QueryHandler(ListSalaryStructuresQuery)
export class ListSalaryStructuresHandler implements IQueryHandler<ListSalaryStructuresQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: ListSalaryStructuresQuery) {
    return {
      data: serializeBigInt(
        await this.repo.listSalaryStructures(query.tenantId),
      ),
    };
  }
}

@QueryHandler(GetSalaryStructureQuery)
export class GetSalaryStructureHandler implements IQueryHandler<GetSalaryStructureQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: GetSalaryStructureQuery) {
    const item = await this.repo.findSalaryStructure(query.tenantId, query.id);
    if (!item) notFound('SALARY_STRUCTURE_NOT_FOUND', 'Salary structure');
    return { data: serializeBigInt(item) };
  }
}

@QueryHandler(GetSalaryStructureVersionHistoryQuery)
export class GetSalaryStructureVersionHistoryHandler implements IQueryHandler<GetSalaryStructureVersionHistoryQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: GetSalaryStructureVersionHistoryQuery) {
    const item = await this.repo.findSalaryStructure(
      query.tenantId,
      query.structureId,
    );
    if (!item) notFound('SALARY_STRUCTURE_NOT_FOUND', 'Salary structure');
    return {
      data: serializeBigInt(
        await this.repo.listSalaryStructureVersions(
          query.tenantId,
          query.structureId,
        ),
      ),
    };
  }
}

@QueryHandler(GetEmployeePayrollProfileQuery)
export class GetEmployeePayrollProfileHandler implements IQueryHandler<GetEmployeePayrollProfileQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: GetEmployeePayrollProfileQuery) {
    const profile = await this.repo.getEmployeePayrollProfile(
      query.tenantId,
      query.employeeId,
    );
    if (!profile) {
      notFound(
        'EMPLOYEE_PAYROLL_PROFILE_NOT_FOUND',
        'Employee payroll profile',
      );
    }
    return { data: profile };
  }
}

@QueryHandler(GetEmployeeEffectiveCompensationQuery)
export class GetEmployeeEffectiveCompensationHandler implements IQueryHandler<GetEmployeeEffectiveCompensationQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: GetEmployeeEffectiveCompensationQuery) {
    const profile = await this.repo.getEmployeePayrollProfile(
      query.tenantId,
      query.employeeId,
    );
    if (!profile) {
      notFound(
        'EMPLOYEE_PAYROLL_PROFILE_NOT_FOUND',
        'Employee payroll profile',
      );
    }
    const date = new Date(`${query.effectiveDate}T00:00:00.000Z`);
    const compensation = (
      await this.repo.listEmployeeCompensations(query.tenantId, profile.id)
    ).find(
      (item) =>
        item.effectiveFrom <= date &&
        (!item.effectiveTo || item.effectiveTo >= date),
    );
    if (!compensation) {
      notFound('EMPLOYEE_PAYROLL_PROFILE_NOT_FOUND', 'Compensation version');
    }
    return { data: serializeBigInt(compensation) };
  }
}

@QueryHandler(GetEmployeeCompensationHistoryQuery)
export class GetEmployeeCompensationHistoryHandler implements IQueryHandler<GetEmployeeCompensationHistoryQuery> {
  constructor(
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(query: GetEmployeeCompensationHistoryQuery) {
    const profile = await this.repo.getEmployeePayrollProfile(
      query.tenantId,
      query.employeeId,
    );
    if (!profile) {
      notFound(
        'EMPLOYEE_PAYROLL_PROFILE_NOT_FOUND',
        'Employee payroll profile',
      );
    }
    return {
      data: serializeBigInt(
        await this.repo.listEmployeeCompensations(query.tenantId, profile.id),
      ),
    };
  }
}

@QueryHandler(GetEffectivePayrollPolicyQuery)
export class GetEffectivePayrollPolicyHandler implements IQueryHandler<GetEffectivePayrollPolicyQuery> {
  constructor(private readonly resolver: EffectivePayrollPolicyResolver) {}

  execute(query: GetEffectivePayrollPolicyQuery) {
    return this.resolver
      .resolve({
        tenantId: query.tenantId,
        employeeId: query.employeeId,
        payGroupId: query.payGroupId,
        policyType: query.policyType,
        effectiveDate: query.effectiveDate,
      })
      .then((data) => ({ data }));
  }
}

function notFound(code: string, name: string): never {
  throw new NotFoundException({
    code,
    message: `${name} was not found`,
  });
}

function serializeBigInt<T>(value: T): T {
  const serialized = JSON.stringify(value, (_key: string, item: unknown) =>
    typeof item === 'bigint' ? item.toString() : item,
  );
  const parsed: unknown = JSON.parse(serialized);
  return parsed as T;
}

export const PayrollFoundationQueryHandlers = [
  GetPayrollSettingsHandler,
  ListPayGroupsHandler,
  GetPayGroupHandler,
  ListPayGroupEmployeesHandler,
  ListPayComponentsHandler,
  GetPayComponentHandler,
  GetPayComponentVersionHistoryHandler,
  ListSalaryStructuresHandler,
  GetSalaryStructureHandler,
  GetSalaryStructureVersionHistoryHandler,
  GetEmployeePayrollProfileHandler,
  GetEmployeeEffectiveCompensationHandler,
  GetEmployeeCompensationHistoryHandler,
  GetEffectivePayrollPolicyHandler,
];

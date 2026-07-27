export class GetPayrollSettingsQuery {
  constructor(readonly tenantId: string) {}
}

export class ListPayGroupsQuery {
  constructor(readonly tenantId: string) {}
}

export class GetPayGroupQuery {
  constructor(
    readonly tenantId: string,
    readonly id: string,
  ) {}
}

export class ListPayGroupEmployeesQuery {
  constructor(
    readonly tenantId: string,
    readonly payGroupId: string,
  ) {}
}

export class ListPayComponentsQuery {
  constructor(readonly tenantId: string) {}
}

export class GetPayComponentQuery {
  constructor(
    readonly tenantId: string,
    readonly id: string,
  ) {}
}

export class GetPayComponentVersionHistoryQuery {
  constructor(
    readonly tenantId: string,
    readonly componentId: string,
  ) {}
}

export class ListSalaryStructuresQuery {
  constructor(readonly tenantId: string) {}
}

export class GetSalaryStructureQuery {
  constructor(
    readonly tenantId: string,
    readonly id: string,
  ) {}
}

export class GetSalaryStructureVersionHistoryQuery {
  constructor(
    readonly tenantId: string,
    readonly structureId: string,
  ) {}
}

export class GetEmployeePayrollProfileQuery {
  constructor(
    readonly tenantId: string,
    readonly employeeId: string,
  ) {}
}

export class GetEmployeeEffectiveCompensationQuery {
  constructor(
    readonly tenantId: string,
    readonly employeeId: string,
    readonly effectiveDate: string,
  ) {}
}

export class GetEmployeeCompensationHistoryQuery {
  constructor(
    readonly tenantId: string,
    readonly employeeId: string,
  ) {}
}

export class GetEffectivePayrollPolicyQuery {
  constructor(
    readonly tenantId: string,
    readonly employeeId: string,
    readonly payGroupId: string | undefined,
    readonly policyType: string,
    readonly effectiveDate: string,
  ) {}
}

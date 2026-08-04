import { PayrollAuditQueryDto } from '../dto/payroll-administration.dto';

export class ListPayrollCalendarsQuery {
  constructor(public readonly tenantId: string) {}
}

export class GetPayrollCalendarQuery {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
  ) {}
}

export class ListPayrollPoliciesQuery {
  constructor(public readonly tenantId: string) {}
}

export class ListEmployeePaymentDetailsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly employeeId: string,
  ) {}
}

export class ListEmployeeStatutoryDetailsQuery extends ListEmployeePaymentDetailsQuery {}

export class ListPayrollApprovalPoliciesQuery {
  constructor(public readonly tenantId: string) {}
}

export class ListPayrollAccountingMappingsQuery {
  constructor(public readonly tenantId: string) {}
}

export class GetPayrollAuditHistoryQuery {
  constructor(
    public readonly tenantId: string,
    public readonly query: PayrollAuditQueryDto,
  ) {}
}

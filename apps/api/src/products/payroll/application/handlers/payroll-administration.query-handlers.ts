import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetPayrollAuditHistoryQuery,
  GetPayrollCalendarQuery,
  ListEmployeePaymentDetailsQuery,
  ListEmployeeStatutoryDetailsQuery,
  ListPayrollAccountingMappingsQuery,
  ListPayrollApprovalPoliciesQuery,
  ListPayrollCalendarsQuery,
  ListPayrollPoliciesQuery,
} from '../queries/payroll-administration.queries';
import { PayrollAccountingAdministrationService } from '../services/payroll-accounting-administration.service';
import { PayrollApprovalAdministrationService } from '../services/payroll-approval-administration.service';
import { PayrollAuditQueryService } from '../services/payroll-audit-query.service';
import { PayrollCalendarAdministrationService } from '../services/payroll-calendar-administration.service';
import { PayrollPolicyAdministrationService } from '../services/payroll-policy-administration.service';
import { PayrollProtectedDataService } from '../services/payroll-protected-data.service';

@QueryHandler(ListPayrollCalendarsQuery)
export class ListPayrollCalendarsHandler implements IQueryHandler<ListPayrollCalendarsQuery> {
  constructor(private readonly service: PayrollCalendarAdministrationService) {}
  execute(query: ListPayrollCalendarsQuery) {
    return this.service.list(query.tenantId);
  }
}

@QueryHandler(GetPayrollCalendarQuery)
export class GetPayrollCalendarHandler implements IQueryHandler<GetPayrollCalendarQuery> {
  constructor(private readonly service: PayrollCalendarAdministrationService) {}
  execute(query: GetPayrollCalendarQuery) {
    return this.service.get(query.tenantId, query.id);
  }
}

@QueryHandler(ListPayrollPoliciesQuery)
export class ListPayrollPoliciesHandler implements IQueryHandler<ListPayrollPoliciesQuery> {
  constructor(private readonly service: PayrollPolicyAdministrationService) {}
  execute(query: ListPayrollPoliciesQuery) {
    return this.service.list(query.tenantId);
  }
}

@QueryHandler(ListEmployeePaymentDetailsQuery)
export class ListEmployeePaymentDetailsHandler implements IQueryHandler<ListEmployeePaymentDetailsQuery> {
  constructor(private readonly service: PayrollProtectedDataService) {}
  execute(query: ListEmployeePaymentDetailsQuery) {
    return this.service.listPaymentDetails(query.tenantId, query.employeeId);
  }
}

@QueryHandler(ListEmployeeStatutoryDetailsQuery)
export class ListEmployeeStatutoryDetailsHandler implements IQueryHandler<ListEmployeeStatutoryDetailsQuery> {
  constructor(private readonly service: PayrollProtectedDataService) {}
  execute(query: ListEmployeeStatutoryDetailsQuery) {
    return this.service.listStatutoryDetails(query.tenantId, query.employeeId);
  }
}

@QueryHandler(ListPayrollApprovalPoliciesQuery)
export class ListPayrollApprovalPoliciesHandler implements IQueryHandler<ListPayrollApprovalPoliciesQuery> {
  constructor(private readonly service: PayrollApprovalAdministrationService) {}
  execute(query: ListPayrollApprovalPoliciesQuery) {
    return this.service.list(query.tenantId);
  }
}

@QueryHandler(ListPayrollAccountingMappingsQuery)
export class ListPayrollAccountingMappingsHandler implements IQueryHandler<ListPayrollAccountingMappingsQuery> {
  constructor(
    private readonly service: PayrollAccountingAdministrationService,
  ) {}
  execute(query: ListPayrollAccountingMappingsQuery) {
    return this.service.list(query.tenantId);
  }
}

@QueryHandler(GetPayrollAuditHistoryQuery)
export class GetPayrollAuditHistoryHandler implements IQueryHandler<GetPayrollAuditHistoryQuery> {
  constructor(private readonly service: PayrollAuditQueryService) {}
  execute(query: GetPayrollAuditHistoryQuery) {
    return this.service.list(query.tenantId, query.query);
  }
}

export const PayrollAdministrationQueryHandlers = [
  ListPayrollCalendarsHandler,
  GetPayrollCalendarHandler,
  ListPayrollPoliciesHandler,
  ListEmployeePaymentDetailsHandler,
  ListEmployeeStatutoryDetailsHandler,
  ListPayrollApprovalPoliciesHandler,
  ListPayrollAccountingMappingsHandler,
  GetPayrollAuditHistoryHandler,
];

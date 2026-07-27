import {
  CreatePayrollAccountingMappingDto,
  CreatePayrollApprovalPolicyDto,
  CreatePayrollApprovalPolicyVersionDto,
  CreatePayrollCalendarDto,
  CreatePayrollCalendarVersionDto,
  CreatePayrollPolicyDto,
  CreatePayrollPolicyVersionDto,
  UpdatePayrollAccountingMappingDto,
  UpdatePayrollApprovalPolicyDto,
  UpdatePayrollCalendarDto,
  UpdatePayrollPolicyDto,
  UpdateProtectedDetailStatusDto,
  UpsertEmployeePaymentDetailDto,
  UpsertEmployeeStatutoryDetailDto,
} from '../dto/payroll-administration.dto';

export type PayrollActor = { tenantId: string; userId: string };

export class CreatePayrollCalendarCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly dto: CreatePayrollCalendarDto,
  ) {}
}

export class UpdatePayrollCalendarCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly id: string,
    public readonly dto: UpdatePayrollCalendarDto,
  ) {}
}

export class CreatePayrollCalendarVersionCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly id: string,
    public readonly dto: CreatePayrollCalendarVersionDto,
  ) {}
}

export class ActivatePayrollCalendarCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly id: string,
  ) {}
}

export class DeactivatePayrollCalendarCommand extends ActivatePayrollCalendarCommand {}

export class CreatePayrollPolicyCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly dto: CreatePayrollPolicyDto,
  ) {}
}

export class UpdatePayrollPolicyCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly id: string,
    public readonly dto: UpdatePayrollPolicyDto,
  ) {}
}

export class CreatePayrollPolicyVersionCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly policyId: string,
    public readonly dto: CreatePayrollPolicyVersionDto,
  ) {}
}

export class ActivatePayrollPolicyVersionCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly policyId: string,
    public readonly versionId: string,
  ) {}
}

export class UpsertEmployeePaymentDetailCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly employeeId: string,
    public readonly dto: UpsertEmployeePaymentDetailDto,
  ) {}
}

export class UpdatePaymentDetailStatusCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly id: string,
    public readonly dto: UpdateProtectedDetailStatusDto,
  ) {}
}

export class UpsertEmployeeStatutoryDetailCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly employeeId: string,
    public readonly dto: UpsertEmployeeStatutoryDetailDto,
  ) {}
}

export class UpdateStatutoryDetailStatusCommand extends UpdatePaymentDetailStatusCommand {}

export class CreatePayrollApprovalPolicyCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly dto: CreatePayrollApprovalPolicyDto,
  ) {}
}

export class UpdatePayrollApprovalPolicyCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly id: string,
    public readonly dto: UpdatePayrollApprovalPolicyDto,
  ) {}
}

export class CreatePayrollApprovalPolicyVersionCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly approvalPolicyId: string,
    public readonly dto: CreatePayrollApprovalPolicyVersionDto,
  ) {}
}

export class ActivatePayrollApprovalPolicyVersionCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly approvalPolicyId: string,
    public readonly versionId: string,
  ) {}
}

export class CreatePayrollAccountingMappingCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly dto: CreatePayrollAccountingMappingDto,
  ) {}
}

export class UpdatePayrollAccountingMappingCommand {
  constructor(
    public readonly actor: PayrollActor,
    public readonly id: string,
    public readonly dto: UpdatePayrollAccountingMappingDto,
  ) {}
}

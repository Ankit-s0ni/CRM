import { Injectable } from '@nestjs/common';
import {
  CreatePayrollApprovalPolicyDto,
  CreatePayrollApprovalPolicyVersionDto,
  UpdatePayrollApprovalPolicyDto,
} from '../dto/payroll-administration.dto';
import { PayrollAdministrationService } from './payroll-administration.service';

type Actor = { tenantId: string; userId: string };

@Injectable()
export class PayrollApprovalAdministrationService {
  constructor(private readonly administration: PayrollAdministrationService) {}

  list(tenantId: string) {
    return this.administration.listApprovalPolicies(tenantId);
  }

  create(actor: Actor, dto: CreatePayrollApprovalPolicyDto) {
    return this.administration.createApprovalPolicy(actor, dto);
  }

  update(actor: Actor, id: string, dto: UpdatePayrollApprovalPolicyDto) {
    return this.administration.updateApprovalPolicy(actor, id, dto);
  }

  createVersion(
    actor: Actor,
    approvalPolicyId: string,
    dto: CreatePayrollApprovalPolicyVersionDto,
  ) {
    return this.administration.createApprovalPolicyVersion(
      actor,
      approvalPolicyId,
      dto,
    );
  }

  activateVersion(actor: Actor, approvalPolicyId: string, versionId: string) {
    return this.administration.activateApprovalPolicyVersion(
      actor,
      approvalPolicyId,
      versionId,
    );
  }
}

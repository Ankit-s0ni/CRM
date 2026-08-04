import { Injectable } from '@nestjs/common';
import {
  CreatePayrollPolicyDto,
  CreatePayrollPolicyVersionDto,
  UpdatePayrollPolicyDto,
} from '../dto/payroll-administration.dto';
import { PayrollAdministrationService } from './payroll-administration.service';

type Actor = { tenantId: string; userId: string };

@Injectable()
export class PayrollPolicyAdministrationService {
  constructor(private readonly administration: PayrollAdministrationService) {}

  list(tenantId: string) {
    return this.administration.listPolicies(tenantId);
  }

  create(actor: Actor, dto: CreatePayrollPolicyDto) {
    return this.administration.createPolicy(actor, dto);
  }

  update(actor: Actor, id: string, dto: UpdatePayrollPolicyDto) {
    return this.administration.updatePolicy(actor, id, dto);
  }

  createVersion(
    actor: Actor,
    policyId: string,
    dto: CreatePayrollPolicyVersionDto,
  ) {
    return this.administration.createPolicyVersion(actor, policyId, dto);
  }

  activateVersion(actor: Actor, policyId: string, versionId: string) {
    return this.administration.activatePolicyVersion(
      actor,
      policyId,
      versionId,
    );
  }
}

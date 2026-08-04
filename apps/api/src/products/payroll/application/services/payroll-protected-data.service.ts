import { Injectable } from '@nestjs/common';
import {
  UpdateProtectedDetailStatusDto,
  UpsertEmployeePaymentDetailDto,
  UpsertEmployeeStatutoryDetailDto,
} from '../dto/payroll-administration.dto';
import { PayrollAdministrationService } from './payroll-administration.service';

type Actor = { tenantId: string; userId: string };

@Injectable()
export class PayrollProtectedDataService {
  constructor(private readonly administration: PayrollAdministrationService) {}

  listPaymentDetails(tenantId: string, employeeId: string) {
    return this.administration.listPaymentDetails(tenantId, employeeId);
  }

  upsertPaymentDetail(
    actor: Actor,
    employeeId: string,
    dto: UpsertEmployeePaymentDetailDto,
  ) {
    return this.administration.upsertPaymentDetail(actor, employeeId, dto);
  }

  setPaymentDetailStatus(
    actor: Actor,
    id: string,
    dto: UpdateProtectedDetailStatusDto,
  ) {
    return this.administration.setPaymentDetailStatus(actor, id, dto);
  }

  listStatutoryDetails(tenantId: string, employeeId: string) {
    return this.administration.listStatutoryDetails(tenantId, employeeId);
  }

  upsertStatutoryDetail(
    actor: Actor,
    employeeId: string,
    dto: UpsertEmployeeStatutoryDetailDto,
  ) {
    return this.administration.upsertStatutoryDetail(actor, employeeId, dto);
  }

  setStatutoryDetailStatus(
    actor: Actor,
    id: string,
    dto: UpdateProtectedDetailStatusDto,
  ) {
    return this.administration.setStatutoryDetailStatus(actor, id, dto);
  }
}

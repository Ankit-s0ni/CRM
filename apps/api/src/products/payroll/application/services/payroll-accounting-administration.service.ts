import { Injectable } from '@nestjs/common';
import {
  CreatePayrollAccountingMappingDto,
  UpdatePayrollAccountingMappingDto,
} from '../dto/payroll-administration.dto';
import { PayrollAdministrationService } from './payroll-administration.service';

type Actor = { tenantId: string; userId: string };

@Injectable()
export class PayrollAccountingAdministrationService {
  constructor(private readonly administration: PayrollAdministrationService) {}

  list(tenantId: string) {
    return this.administration.listAccountingMappings(tenantId);
  }

  create(actor: Actor, dto: CreatePayrollAccountingMappingDto) {
    return this.administration.createAccountingMapping(actor, dto);
  }

  update(actor: Actor, id: string, dto: UpdatePayrollAccountingMappingDto) {
    return this.administration.updateAccountingMapping(actor, id, dto);
  }
}

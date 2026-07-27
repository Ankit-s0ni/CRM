import { Injectable } from '@nestjs/common';
import { PayrollAuditQueryDto } from '../dto/payroll-administration.dto';
import { PayrollAdministrationService } from './payroll-administration.service';

@Injectable()
export class PayrollAuditQueryService {
  constructor(private readonly administration: PayrollAdministrationService) {}

  list(tenantId: string, query: PayrollAuditQueryDto) {
    return this.administration.auditHistory(tenantId, query);
  }
}

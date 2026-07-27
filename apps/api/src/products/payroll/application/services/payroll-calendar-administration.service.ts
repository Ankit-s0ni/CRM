import { Injectable } from '@nestjs/common';
import {
  CreatePayrollCalendarDto,
  CreatePayrollCalendarVersionDto,
  UpdatePayrollCalendarDto,
} from '../dto/payroll-administration.dto';
import { PayrollAdministrationService } from './payroll-administration.service';

type Actor = { tenantId: string; userId: string };

@Injectable()
export class PayrollCalendarAdministrationService {
  constructor(private readonly administration: PayrollAdministrationService) {}

  list(tenantId: string) {
    return this.administration.listCalendars(tenantId);
  }

  get(tenantId: string, id: string) {
    return this.administration.getCalendar(tenantId, id);
  }

  create(actor: Actor, dto: CreatePayrollCalendarDto) {
    return this.administration.createCalendar(actor, dto);
  }

  update(actor: Actor, id: string, dto: UpdatePayrollCalendarDto) {
    return this.administration.updateCalendar(actor, id, dto);
  }

  createVersion(
    actor: Actor,
    id: string,
    dto: CreatePayrollCalendarVersionDto,
  ) {
    return this.administration.createCalendarVersion(actor, id, dto);
  }

  activate(actor: Actor, id: string) {
    return this.administration.setCalendarStatus(actor, id, 'ACTIVE');
  }

  deactivate(actor: Actor, id: string) {
    return this.administration.setCalendarStatus(actor, id, 'INACTIVE');
  }
}

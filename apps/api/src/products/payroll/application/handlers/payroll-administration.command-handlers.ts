import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PayrollAccountingAdministrationService } from '../services/payroll-accounting-administration.service';
import { PayrollApprovalAdministrationService } from '../services/payroll-approval-administration.service';
import { PayrollCalendarAdministrationService } from '../services/payroll-calendar-administration.service';
import { PayrollPolicyAdministrationService } from '../services/payroll-policy-administration.service';
import { PayrollProtectedDataService } from '../services/payroll-protected-data.service';
import {
  ActivatePayrollApprovalPolicyVersionCommand,
  ActivatePayrollCalendarCommand,
  ActivatePayrollPolicyVersionCommand,
  CreatePayrollAccountingMappingCommand,
  CreatePayrollApprovalPolicyCommand,
  CreatePayrollApprovalPolicyVersionCommand,
  CreatePayrollCalendarCommand,
  CreatePayrollCalendarVersionCommand,
  CreatePayrollPolicyCommand,
  CreatePayrollPolicyVersionCommand,
  DeactivatePayrollCalendarCommand,
  UpdatePaymentDetailStatusCommand,
  UpdatePayrollAccountingMappingCommand,
  UpdatePayrollApprovalPolicyCommand,
  UpdatePayrollCalendarCommand,
  UpdatePayrollPolicyCommand,
  UpdateStatutoryDetailStatusCommand,
  UpsertEmployeePaymentDetailCommand,
  UpsertEmployeeStatutoryDetailCommand,
} from '../commands/payroll-administration.commands';

@CommandHandler(CreatePayrollCalendarCommand)
export class CreatePayrollCalendarHandler implements ICommandHandler<CreatePayrollCalendarCommand> {
  constructor(private readonly service: PayrollCalendarAdministrationService) {}
  execute(command: CreatePayrollCalendarCommand) {
    return this.service.create(command.actor, command.dto);
  }
}

@CommandHandler(UpdatePayrollCalendarCommand)
export class UpdatePayrollCalendarHandler implements ICommandHandler<UpdatePayrollCalendarCommand> {
  constructor(private readonly service: PayrollCalendarAdministrationService) {}
  execute(command: UpdatePayrollCalendarCommand) {
    return this.service.update(command.actor, command.id, command.dto);
  }
}

@CommandHandler(CreatePayrollCalendarVersionCommand)
export class CreatePayrollCalendarVersionHandler implements ICommandHandler<CreatePayrollCalendarVersionCommand> {
  constructor(private readonly service: PayrollCalendarAdministrationService) {}
  execute(command: CreatePayrollCalendarVersionCommand) {
    return this.service.createVersion(command.actor, command.id, command.dto);
  }
}

@CommandHandler(ActivatePayrollCalendarCommand)
export class ActivatePayrollCalendarHandler implements ICommandHandler<ActivatePayrollCalendarCommand> {
  constructor(private readonly service: PayrollCalendarAdministrationService) {}
  execute(command: ActivatePayrollCalendarCommand) {
    return this.service.activate(command.actor, command.id);
  }
}

@CommandHandler(DeactivatePayrollCalendarCommand)
export class DeactivatePayrollCalendarHandler implements ICommandHandler<DeactivatePayrollCalendarCommand> {
  constructor(private readonly service: PayrollCalendarAdministrationService) {}
  execute(command: DeactivatePayrollCalendarCommand) {
    return this.service.deactivate(command.actor, command.id);
  }
}

@CommandHandler(CreatePayrollPolicyCommand)
export class CreatePayrollPolicyHandler implements ICommandHandler<CreatePayrollPolicyCommand> {
  constructor(private readonly service: PayrollPolicyAdministrationService) {}
  execute(command: CreatePayrollPolicyCommand) {
    return this.service.create(command.actor, command.dto);
  }
}

@CommandHandler(UpdatePayrollPolicyCommand)
export class UpdatePayrollPolicyHandler implements ICommandHandler<UpdatePayrollPolicyCommand> {
  constructor(private readonly service: PayrollPolicyAdministrationService) {}
  execute(command: UpdatePayrollPolicyCommand) {
    return this.service.update(command.actor, command.id, command.dto);
  }
}

@CommandHandler(CreatePayrollPolicyVersionCommand)
export class CreatePayrollPolicyVersionHandler implements ICommandHandler<CreatePayrollPolicyVersionCommand> {
  constructor(private readonly service: PayrollPolicyAdministrationService) {}
  execute(command: CreatePayrollPolicyVersionCommand) {
    return this.service.createVersion(
      command.actor,
      command.policyId,
      command.dto,
    );
  }
}

@CommandHandler(ActivatePayrollPolicyVersionCommand)
export class ActivatePayrollPolicyVersionHandler implements ICommandHandler<ActivatePayrollPolicyVersionCommand> {
  constructor(private readonly service: PayrollPolicyAdministrationService) {}
  execute(command: ActivatePayrollPolicyVersionCommand) {
    return this.service.activateVersion(
      command.actor,
      command.policyId,
      command.versionId,
    );
  }
}

@CommandHandler(UpsertEmployeePaymentDetailCommand)
export class UpsertEmployeePaymentDetailHandler implements ICommandHandler<UpsertEmployeePaymentDetailCommand> {
  constructor(private readonly service: PayrollProtectedDataService) {}
  execute(command: UpsertEmployeePaymentDetailCommand) {
    return this.service.upsertPaymentDetail(
      command.actor,
      command.employeeId,
      command.dto,
    );
  }
}

@CommandHandler(UpdatePaymentDetailStatusCommand)
export class UpdatePaymentDetailStatusHandler implements ICommandHandler<UpdatePaymentDetailStatusCommand> {
  constructor(private readonly service: PayrollProtectedDataService) {}
  execute(command: UpdatePaymentDetailStatusCommand) {
    return this.service.setPaymentDetailStatus(
      command.actor,
      command.id,
      command.dto,
    );
  }
}

@CommandHandler(UpsertEmployeeStatutoryDetailCommand)
export class UpsertEmployeeStatutoryDetailHandler implements ICommandHandler<UpsertEmployeeStatutoryDetailCommand> {
  constructor(private readonly service: PayrollProtectedDataService) {}
  execute(command: UpsertEmployeeStatutoryDetailCommand) {
    return this.service.upsertStatutoryDetail(
      command.actor,
      command.employeeId,
      command.dto,
    );
  }
}

@CommandHandler(UpdateStatutoryDetailStatusCommand)
export class UpdateStatutoryDetailStatusHandler implements ICommandHandler<UpdateStatutoryDetailStatusCommand> {
  constructor(private readonly service: PayrollProtectedDataService) {}
  execute(command: UpdateStatutoryDetailStatusCommand) {
    return this.service.setStatutoryDetailStatus(
      command.actor,
      command.id,
      command.dto,
    );
  }
}

@CommandHandler(CreatePayrollApprovalPolicyCommand)
export class CreatePayrollApprovalPolicyHandler implements ICommandHandler<CreatePayrollApprovalPolicyCommand> {
  constructor(private readonly service: PayrollApprovalAdministrationService) {}
  execute(command: CreatePayrollApprovalPolicyCommand) {
    return this.service.create(command.actor, command.dto);
  }
}

@CommandHandler(UpdatePayrollApprovalPolicyCommand)
export class UpdatePayrollApprovalPolicyHandler implements ICommandHandler<UpdatePayrollApprovalPolicyCommand> {
  constructor(private readonly service: PayrollApprovalAdministrationService) {}
  execute(command: UpdatePayrollApprovalPolicyCommand) {
    return this.service.update(command.actor, command.id, command.dto);
  }
}

@CommandHandler(CreatePayrollApprovalPolicyVersionCommand)
export class CreatePayrollApprovalPolicyVersionHandler implements ICommandHandler<CreatePayrollApprovalPolicyVersionCommand> {
  constructor(private readonly service: PayrollApprovalAdministrationService) {}
  execute(command: CreatePayrollApprovalPolicyVersionCommand) {
    return this.service.createVersion(
      command.actor,
      command.approvalPolicyId,
      command.dto,
    );
  }
}

@CommandHandler(ActivatePayrollApprovalPolicyVersionCommand)
export class ActivatePayrollApprovalPolicyVersionHandler implements ICommandHandler<ActivatePayrollApprovalPolicyVersionCommand> {
  constructor(private readonly service: PayrollApprovalAdministrationService) {}
  execute(command: ActivatePayrollApprovalPolicyVersionCommand) {
    return this.service.activateVersion(
      command.actor,
      command.approvalPolicyId,
      command.versionId,
    );
  }
}

@CommandHandler(CreatePayrollAccountingMappingCommand)
export class CreatePayrollAccountingMappingHandler implements ICommandHandler<CreatePayrollAccountingMappingCommand> {
  constructor(
    private readonly service: PayrollAccountingAdministrationService,
  ) {}
  execute(command: CreatePayrollAccountingMappingCommand) {
    return this.service.create(command.actor, command.dto);
  }
}

@CommandHandler(UpdatePayrollAccountingMappingCommand)
export class UpdatePayrollAccountingMappingHandler implements ICommandHandler<UpdatePayrollAccountingMappingCommand> {
  constructor(
    private readonly service: PayrollAccountingAdministrationService,
  ) {}
  execute(command: UpdatePayrollAccountingMappingCommand) {
    return this.service.update(command.actor, command.id, command.dto);
  }
}

export const PayrollAdministrationCommandHandlers = [
  CreatePayrollCalendarHandler,
  UpdatePayrollCalendarHandler,
  CreatePayrollCalendarVersionHandler,
  ActivatePayrollCalendarHandler,
  DeactivatePayrollCalendarHandler,
  CreatePayrollPolicyHandler,
  UpdatePayrollPolicyHandler,
  CreatePayrollPolicyVersionHandler,
  ActivatePayrollPolicyVersionHandler,
  UpsertEmployeePaymentDetailHandler,
  UpdatePaymentDetailStatusHandler,
  UpsertEmployeeStatutoryDetailHandler,
  UpdateStatutoryDetailStatusHandler,
  CreatePayrollApprovalPolicyHandler,
  UpdatePayrollApprovalPolicyHandler,
  CreatePayrollApprovalPolicyVersionHandler,
  ActivatePayrollApprovalPolicyVersionHandler,
  CreatePayrollAccountingMappingHandler,
  UpdatePayrollAccountingMappingHandler,
];

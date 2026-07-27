import {
  AddSalaryStructureComponentDto,
  AssignEmployeeToPayGroupDto,
  CreateEmployeeCompensationVersionDto,
  CreateEmployeePayrollProfileDto,
  CreatePayComponentDto,
  CreatePayComponentVersionDto,
  CreatePayGroupDto,
  CreatePayrollSettingsDto,
  CreateSalaryStructureDto,
  CreateSalaryStructureVersionDto,
  EndEmployeeCompensationVersionDto,
  UpdateEmployeePayrollProfileDto,
  UpdatePayGroupDto,
  UpdatePayrollSettingsDto,
} from '../dto/payroll-foundation.dto';

export class CreatePayrollSettingsCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly dto: CreatePayrollSettingsDto,
  ) {}
}

export class UpdatePayrollSettingsCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly dto: UpdatePayrollSettingsDto,
  ) {}
}

export class CreatePayGroupCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly dto: CreatePayGroupDto,
  ) {}
}

export class UpdatePayGroupCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly id: string,
    readonly dto: UpdatePayGroupDto,
  ) {}
}

export class AssignEmployeeToPayGroupCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly payGroupId: string,
    readonly dto: AssignEmployeeToPayGroupDto,
  ) {}
}

export class RemoveEmployeeFromPayGroupCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly payGroupId: string,
    readonly employeeId: string,
  ) {}
}

export class CreatePayComponentCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly dto: CreatePayComponentDto,
  ) {}
}

export class CreatePayComponentVersionCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly componentId: string,
    readonly dto: CreatePayComponentVersionDto,
  ) {}
}

export class ActivatePayComponentVersionCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly componentId: string,
    readonly versionId: string,
  ) {}
}

export class CreateSalaryStructureCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly dto: CreateSalaryStructureDto,
  ) {}
}

export class CreateSalaryStructureVersionCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly structureId: string,
    readonly dto: CreateSalaryStructureVersionDto,
  ) {}
}

export class AddComponentToSalaryStructureVersionCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly versionId: string,
    readonly dto: AddSalaryStructureComponentDto,
  ) {}
}

export class RemoveComponentFromSalaryStructureVersionCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly versionId: string,
    readonly componentVersionId: string,
  ) {}
}

export class ActivateSalaryStructureVersionCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly structureId: string,
    readonly versionId: string,
  ) {}
}

export class CreateEmployeePayrollProfileCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly employeeId: string,
    readonly dto: CreateEmployeePayrollProfileDto,
  ) {}
}

export class UpdateEmployeePayrollProfileCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly employeeId: string,
    readonly dto: UpdateEmployeePayrollProfileDto,
  ) {}
}

export class CreateEmployeeCompensationVersionCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly employeeId: string,
    readonly dto: CreateEmployeeCompensationVersionDto,
  ) {}
}

export class EndEmployeeCompensationVersionCommand {
  constructor(
    readonly tenantId: string,
    readonly actorId: string,
    readonly employeeId: string,
    readonly compensationId: string,
    readonly dto: EndEmployeeCompensationVersionDto,
  ) {}
}

import {
  ConflictException,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PayrollVersionStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../../../platform/audit/public';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { OutboxService } from '../../../../shared/events/outbox.service';
import {
  assertEffectiveDateRange,
  parseDateOnly,
  rangesOverlap,
} from '../../domain/value-objects/effective-date-range';
import { MoneyValue } from '../../domain/value-objects/money-value';
import { PAYROLL_FOUNDATION_REPOSITORY } from '../ports/payroll-foundation.repository';
import type { PayrollFoundationRepository } from '../ports/payroll-foundation.repository';
import {
  assertPayoutDateRule,
  assertPeriodRule,
} from '../services/payroll-configuration-validation.service';
import {
  ActivatePayComponentVersionCommand,
  ActivateSalaryStructureVersionCommand,
  AddComponentToSalaryStructureVersionCommand,
  AssignEmployeeToPayGroupCommand,
  CreateEmployeeCompensationVersionCommand,
  CreateEmployeePayrollProfileCommand,
  CreatePayComponentCommand,
  CreatePayComponentVersionCommand,
  CreatePayGroupCommand,
  CreatePayrollSettingsCommand,
  CreateSalaryStructureCommand,
  CreateSalaryStructureVersionCommand,
  EndEmployeeCompensationVersionCommand,
  RemoveComponentFromSalaryStructureVersionCommand,
  RemoveEmployeeFromPayGroupCommand,
  UpdateEmployeePayrollProfileCommand,
  UpdatePayGroupCommand,
  UpdatePayrollSettingsCommand,
} from '../commands/payroll-foundation.commands';

@CommandHandler(CreatePayrollSettingsCommand)
export class CreatePayrollSettingsHandler implements ICommandHandler<CreatePayrollSettingsCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: CreatePayrollSettingsCommand) {
    const dto = command.dto;
    assertPeriodRule(dto.defaultPayPeriodRule, 'defaultPayPeriodRule');
    assertPayoutDateRule(dto.defaultPayoutDateRule);
    const range = rangeFrom(dto);
    MoneyValue.scaleFor(dto.defaultCurrency);
    return this.prisma.forTenant(async (tx) => {
      const existing = await this.repo.getSettings(command.tenantId, tx);
      if (existing) {
        throw new ConflictException({
          code: 'PAYROLL_SETTINGS_ALREADY_EXIST',
          message: 'Payroll settings already exist for this workspace',
        });
      }
      const settings = await this.repo.createSettings(
        {
          tenantId: command.tenantId,
          countryCode: dto.countryCode,
          defaultCurrency: dto.defaultCurrency.toUpperCase(),
          locale: dto.locale,
          timezone: dto.timezone,
          payFrequency: dto.payFrequency,
          defaultPayPeriodRule: json(dto.defaultPayPeriodRule),
          defaultPayoutDateRule: json(dto.defaultPayoutDateRule),
          workingDayBasis: dto.workingDayBasis,
          defaultProrationPolicy: json(dto.defaultProrationPolicy),
          defaultRoundingPolicy: json(dto.defaultRoundingPolicy),
          moduleStatus: dto.moduleStatus ?? 'DRAFT',
          effectiveFrom: range.effectiveFrom,
          effectiveTo: range.effectiveTo,
          createdBy: command.actorId,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.settings.created',
        entityType: 'PayrollSettings',
        entityId: settings.id,
        payload: safeSettings(settings),
      });
      return { data: { id: settings.id, version: settings.version } };
    });
  }
}

@CommandHandler(UpdatePayrollSettingsCommand)
export class UpdatePayrollSettingsHandler implements ICommandHandler<UpdatePayrollSettingsCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: UpdatePayrollSettingsCommand) {
    return this.prisma.forTenant(async (tx) => {
      const existing = await this.repo.getSettings(command.tenantId, tx);
      if (!existing) notFound('PAYROLL_SETTINGS_NOT_FOUND', 'Payroll settings');
      if (existing.version !== command.dto.version) versionConflict();
      const range =
        command.dto.effectiveFrom || command.dto.effectiveTo
          ? rangeFrom({
              effectiveFrom:
                command.dto.effectiveFrom ??
                existing.effectiveFrom.toISOString().slice(0, 10),
              effectiveTo: command.dto.effectiveTo ?? undefined,
            })
          : undefined;
      if (command.dto.defaultPayPeriodRule) {
        assertPeriodRule(
          command.dto.defaultPayPeriodRule,
          'defaultPayPeriodRule',
        );
      }
      if (command.dto.defaultPayoutDateRule) {
        assertPayoutDateRule(command.dto.defaultPayoutDateRule);
      }
      if (command.dto.defaultCurrency)
        MoneyValue.scaleFor(command.dto.defaultCurrency);
      const updateData = {
        ...stripUndefined({
          countryCode: command.dto.countryCode,
          defaultCurrency: command.dto.defaultCurrency?.toUpperCase(),
          locale: command.dto.locale,
          timezone: command.dto.timezone,
          payFrequency: command.dto.payFrequency,
          defaultPayPeriodRule: command.dto.defaultPayPeriodRule
            ? json(command.dto.defaultPayPeriodRule)
            : undefined,
          defaultPayoutDateRule: command.dto.defaultPayoutDateRule
            ? json(command.dto.defaultPayoutDateRule)
            : undefined,
          workingDayBasis: command.dto.workingDayBasis,
          defaultProrationPolicy: command.dto.defaultProrationPolicy
            ? json(command.dto.defaultProrationPolicy)
            : undefined,
          defaultRoundingPolicy: command.dto.defaultRoundingPolicy
            ? json(command.dto.defaultRoundingPolicy)
            : undefined,
          moduleStatus: command.dto.moduleStatus,
          effectiveFrom: range?.effectiveFrom,
          effectiveTo: range?.effectiveTo,
          updatedBy: command.actorId,
        }),
        version: { increment: 1 },
      };
      const update = await tx.payrollSettings.updateMany({
        where: { id: existing.id, version: command.dto.version },
        data: updateData,
      });
      if (update.count !== 1) versionConflict();
      const updated = await tx.payrollSettings.findUniqueOrThrow({
        where: { id: existing.id },
      });
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.settings.updated',
        entityType: 'PayrollSettings',
        entityId: updated.id,
        payload: safeSettings(updated),
      });
      return { data: { id: updated.id, version: updated.version } };
    });
  }
}

@CommandHandler(CreatePayGroupCommand)
export class CreatePayGroupHandler implements ICommandHandler<CreatePayGroupCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: CreatePayGroupCommand) {
    const dto = command.dto;
    const range = rangeFrom(dto);
    MoneyValue.scaleFor(dto.currency);
    return this.prisma.forTenant(async (tx) => {
      const duplicate = await tx.payGroup.findFirst({
        where: {
          tenantId: command.tenantId,
          code: { equals: dto.code, mode: 'insensitive' },
        },
      });
      if (duplicate) {
        throw new ConflictException({
          code: 'PAY_GROUP_CODE_ALREADY_EXISTS',
          message: 'A pay group with this code already exists',
        });
      }
      await validatePayGroupReferences(tx, command.tenantId, dto);
      const payGroup = await this.repo.createPayGroup(
        {
          tenantId: command.tenantId,
          calendarId: dto.calendarId,
          name: dto.name,
          code: dto.code.toUpperCase(),
          description: dto.description,
          currency: dto.currency.toUpperCase(),
          countryCode: dto.countryCode,
          prorationPolicyOverride: dto.prorationPolicyOverride
            ? json(dto.prorationPolicyOverride)
            : undefined,
          roundingPolicyOverride: dto.roundingPolicyOverride
            ? json(dto.roundingPolicyOverride)
            : undefined,
          overtimePolicyId: dto.overtimePolicyId,
          lossOfPayPolicyId: dto.lossOfPayPolicyId,
          approvalPolicyId: dto.approvalPolicyId,
          effectiveFrom: range.effectiveFrom,
          effectiveTo: range.effectiveTo,
          createdBy: command.actorId,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.pay_group.created',
        entityType: 'PayGroup',
        entityId: payGroup.id,
        payload: { code: payGroup.code, name: payGroup.name },
      });
      return { data: { id: payGroup.id, version: payGroup.version } };
    });
  }
}

@CommandHandler(UpdatePayGroupCommand)
export class UpdatePayGroupHandler implements ICommandHandler<UpdatePayGroupCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: UpdatePayGroupCommand) {
    return this.prisma.forTenant(async (tx) => {
      const existing = await this.repo.findPayGroup(
        command.tenantId,
        command.id,
        tx,
      );
      if (!existing) notFound('PAY_GROUP_NOT_FOUND', 'Pay group');
      if (existing.version !== command.dto.version) versionConflict();
      const range =
        command.dto.effectiveFrom || command.dto.effectiveTo
          ? rangeFrom({
              effectiveFrom:
                command.dto.effectiveFrom ??
                existing.effectiveFrom.toISOString().slice(0, 10),
              effectiveTo: command.dto.effectiveTo ?? undefined,
            })
          : undefined;
      if (command.dto.currency) MoneyValue.scaleFor(command.dto.currency);
      await validatePayGroupReferences(tx, command.tenantId, command.dto);
      const updated = await this.repo.updatePayGroup(
        existing.id,
        {
          ...stripUndefined({
            calendarId: command.dto.calendarId,
            name: command.dto.name,
            code: command.dto.code?.toUpperCase(),
            description: command.dto.description,
            currency: command.dto.currency?.toUpperCase(),
            countryCode: command.dto.countryCode,
            prorationPolicyOverride: command.dto.prorationPolicyOverride
              ? json(command.dto.prorationPolicyOverride)
              : undefined,
            roundingPolicyOverride: command.dto.roundingPolicyOverride
              ? json(command.dto.roundingPolicyOverride)
              : undefined,
            overtimePolicyId: command.dto.overtimePolicyId,
            lossOfPayPolicyId: command.dto.lossOfPayPolicyId,
            approvalPolicyId: command.dto.approvalPolicyId,
            effectiveFrom: range?.effectiveFrom,
            effectiveTo: range?.effectiveTo,
            updatedBy: command.actorId,
          }),
          version: { increment: 1 },
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.pay_group.updated',
        entityType: 'PayGroup',
        entityId: updated.id,
        payload: { code: updated.code, version: updated.version },
      });
      return { data: { id: updated.id, version: updated.version } };
    });
  }
}

@CommandHandler(AssignEmployeeToPayGroupCommand)
export class AssignEmployeeToPayGroupHandler implements ICommandHandler<AssignEmployeeToPayGroupCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: AssignEmployeeToPayGroupCommand) {
    const range = rangeFrom(command.dto);
    return this.prisma.forTenant(async (tx) => {
      await assertEmployee(
        this.repo,
        command.tenantId,
        command.dto.employeeId,
        tx,
      );
      const payGroup = await this.repo.findPayGroup(
        command.tenantId,
        command.payGroupId,
        tx,
      );
      if (!payGroup) notFound('PAY_GROUP_NOT_FOUND', 'Pay group');
      const existing = await tx.payGroupEmployeeAssignment.findFirst({
        where: {
          tenantId: command.tenantId,
          employeeId: command.dto.employeeId,
          status: 'ACTIVE',
          effectiveTo: null,
        },
      });
      if (existing) {
        throw new ConflictException({
          code: 'EMPLOYEE_ALREADY_ASSIGNED_TO_PAY_GROUP',
          message: 'Employee already has an active pay group assignment',
        });
      }
      const assignment = await this.repo.createPayGroupAssignment(
        {
          tenantId: command.tenantId,
          payGroupId: command.payGroupId,
          employeeId: command.dto.employeeId,
          effectiveFrom: range.effectiveFrom,
          effectiveTo: range.effectiveTo,
          assignedBy: command.actorId,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.pay_group.employee_assigned',
        entityType: 'PayGroupEmployeeAssignment',
        entityId: assignment.id,
        payload: {
          payGroupId: command.payGroupId,
          employeeId: command.dto.employeeId,
        },
      });
      return { data: { id: assignment.id, status: assignment.status } };
    });
  }
}

@CommandHandler(RemoveEmployeeFromPayGroupCommand)
export class RemoveEmployeeFromPayGroupHandler implements ICommandHandler<RemoveEmployeeFromPayGroupCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: RemoveEmployeeFromPayGroupCommand) {
    return this.prisma.forTenant(async (tx) => {
      const assignment = await tx.payGroupEmployeeAssignment.findFirst({
        where: {
          tenantId: command.tenantId,
          payGroupId: command.payGroupId,
          employeeId: command.employeeId,
          status: 'ACTIVE',
          effectiveTo: null,
        },
      });
      if (!assignment) notFound('PAY_GROUP_NOT_FOUND', 'Pay group assignment');
      const updated = await this.repo.updatePayGroupAssignment(
        assignment.id,
        {
          status: 'INACTIVE',
          effectiveTo: new Date(),
          removedBy: command.actorId,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.pay_group.employee_removed',
        entityType: 'PayGroupEmployeeAssignment',
        entityId: updated.id,
        payload: {
          payGroupId: command.payGroupId,
          employeeId: command.employeeId,
        },
      });
      return { data: { id: updated.id, status: updated.status } };
    });
  }
}

@CommandHandler(CreatePayComponentCommand)
export class CreatePayComponentHandler implements ICommandHandler<CreatePayComponentCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: CreatePayComponentCommand) {
    return this.prisma.forTenant(async (tx) => {
      const existing = await this.repo.findPayComponentByCode(
        command.tenantId,
        command.dto.code,
        tx,
      );
      if (existing) {
        throw new ConflictException({
          code: 'PAY_COMPONENT_CODE_ALREADY_EXISTS',
          message: 'A pay component with this code already exists',
        });
      }
      const component = await this.repo.createPayComponent(
        {
          tenantId: command.tenantId,
          code: command.dto.code.toUpperCase(),
          name: command.dto.name,
          description: command.dto.description,
          type: command.dto.type,
          createdBy: command.actorId,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.component.created',
        entityType: 'PayComponent',
        entityId: component.id,
        payload: { code: component.code, type: component.type },
      });
      return { data: { id: component.id } };
    });
  }
}

@CommandHandler(CreatePayComponentVersionCommand)
export class CreatePayComponentVersionHandler implements ICommandHandler<CreatePayComponentVersionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: CreatePayComponentVersionCommand) {
    const range = rangeFrom(command.dto);
    return this.prisma.forTenant(async (tx) => {
      const component = await this.repo.findPayComponent(
        command.tenantId,
        command.componentId,
        tx,
      );
      if (!component) notFound('PAY_COMPONENT_NOT_FOUND', 'Pay component');
      const versions = await this.repo.listPayComponentVersions(
        command.tenantId,
        command.componentId,
        tx,
      );
      const version = (versions[0]?.version ?? 0) + 1;
      const created = await this.repo.createPayComponentVersion(
        {
          tenantId: command.tenantId,
          componentId: command.componentId,
          version,
          valueMode: command.dto.valueMode,
          taxable: command.dto.taxable,
          statutory: command.dto.statutory,
          recurring: command.dto.recurring,
          calculationOrder: command.dto.calculationOrder,
          currencyBehavior: command.dto.currencyBehavior,
          roundingBehavior: json(command.dto.roundingBehavior),
          config: json(command.dto.config),
          effectiveFrom: range.effectiveFrom,
          effectiveTo: range.effectiveTo,
          createdBy: command.actorId,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.component.version_created',
        entityType: 'PayComponentVersion',
        entityId: created.id,
        payload: { componentId: component.id, version },
      });
      return { data: { id: created.id, version } };
    });
  }
}

@CommandHandler(ActivatePayComponentVersionCommand)
export class ActivatePayComponentVersionHandler implements ICommandHandler<ActivatePayComponentVersionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: ActivatePayComponentVersionCommand) {
    return this.prisma.forTenant(async (tx) => {
      const version = await this.repo.findPayComponentVersion(
        command.tenantId,
        command.versionId,
        tx,
      );
      if (!version || version.componentId !== command.componentId) {
        notFound('PAY_COMPONENT_NOT_FOUND', 'Pay component version');
      }
      if (version.status === PayrollVersionStatus.ACTIVE) {
        return { data: { id: version.id, status: version.status } };
      }
      if (version.status !== PayrollVersionStatus.DRAFT)
        immutable('POLICY_VERSION_IMMUTABLE');
      await advisoryLock(
        tx,
        command.tenantId,
        `component:${command.componentId}`,
      );
      const activated = await this.repo.activatePayComponentVersion(
        version.id,
        command.componentId,
        command.actorId,
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.component.version_activated',
        entityType: 'PayComponentVersion',
        entityId: activated.id,
        payload: {
          componentId: activated.componentId,
          version: activated.version,
        },
      });
      return { data: { id: activated.id, status: activated.status } };
    });
  }
}

@CommandHandler(CreateSalaryStructureCommand)
export class CreateSalaryStructureHandler implements ICommandHandler<CreateSalaryStructureCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: CreateSalaryStructureCommand) {
    MoneyValue.scaleFor(command.dto.currency);
    return this.prisma.forTenant(async (tx) => {
      const duplicate = await this.repo.findSalaryStructureByCode(
        command.tenantId,
        command.dto.code,
        tx,
      );
      if (duplicate) {
        throw new ConflictException({
          code: 'SALARY_STRUCTURE_CODE_ALREADY_EXISTS',
          message: 'A salary structure with this code already exists',
        });
      }
      if (command.dto.payGroupId) {
        const group = await this.repo.findPayGroup(
          command.tenantId,
          command.dto.payGroupId,
          tx,
        );
        if (!group) notFound('PAY_GROUP_NOT_FOUND', 'Pay group');
      }
      const structure = await this.repo.createSalaryStructure(
        {
          tenantId: command.tenantId,
          payGroupId: command.dto.payGroupId,
          code: command.dto.code.toUpperCase(),
          name: command.dto.name,
          description: command.dto.description,
          currency: command.dto.currency.toUpperCase(),
          createdBy: command.actorId,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.salary_structure.created',
        entityType: 'SalaryStructure',
        entityId: structure.id,
        payload: { code: structure.code, currency: structure.currency },
      });
      return { data: { id: structure.id } };
    });
  }
}

@CommandHandler(CreateSalaryStructureVersionCommand)
export class CreateSalaryStructureVersionHandler implements ICommandHandler<CreateSalaryStructureVersionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: CreateSalaryStructureVersionCommand) {
    const range = rangeFrom(command.dto);
    return this.prisma.forTenant(async (tx) => {
      const structure = await this.repo.findSalaryStructure(
        command.tenantId,
        command.structureId,
        tx,
      );
      if (!structure)
        notFound('SALARY_STRUCTURE_NOT_FOUND', 'Salary structure');
      const versions = await this.repo.listSalaryStructureVersions(
        command.tenantId,
        command.structureId,
        tx,
      );
      const version = (versions[0]?.version ?? 0) + 1;
      const created = await this.repo.createSalaryStructureVersion(
        {
          tenantId: command.tenantId,
          structureId: command.structureId,
          version,
          effectiveFrom: range.effectiveFrom,
          effectiveTo: range.effectiveTo,
          createdBy: command.actorId,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.salary_structure.version_created',
        entityType: 'SalaryStructureVersion',
        entityId: created.id,
        payload: { structureId: command.structureId, version },
      });
      return { data: { id: created.id, version } };
    });
  }
}

@CommandHandler(AddComponentToSalaryStructureVersionCommand)
export class AddComponentToSalaryStructureVersionHandler implements ICommandHandler<AddComponentToSalaryStructureVersionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: AddComponentToSalaryStructureVersionCommand) {
    return this.prisma.forTenant(async (tx) => {
      const version = await this.repo.findSalaryStructureVersion(
        command.tenantId,
        command.versionId,
        tx,
      );
      if (!version)
        notFound('SALARY_STRUCTURE_NOT_FOUND', 'Salary structure version');
      if (version.status !== PayrollVersionStatus.DRAFT) {
        immutable('SALARY_STRUCTURE_VERSION_IMMUTABLE');
      }
      const componentVersion = await this.repo.findPayComponentVersion(
        command.tenantId,
        command.dto.payComponentVersionId,
        tx,
      );
      if (!componentVersion)
        notFound('PAY_COMPONENT_NOT_FOUND', 'Pay component version');
      const duplicate = await this.repo.findStructureComponent(
        command.tenantId,
        command.versionId,
        command.dto.payComponentVersionId,
        tx,
      );
      if (duplicate) {
        throw new ConflictException({
          code: 'INVALID_COMPONENT_CONFIGURATION',
          message: 'Component already exists on this salary structure version',
        });
      }
      const amount =
        command.dto.fixedAmountMinor === undefined
          ? undefined
          : MoneyValue.fromMinor(
              command.dto.fixedAmountMinor,
              version.structure.currency,
            ).amountMinor;
      const component = await this.repo.addSalaryStructureComponent(
        {
          tenantId: command.tenantId,
          salaryStructureVersionId: command.versionId,
          payComponentVersionId: command.dto.payComponentVersionId,
          fixedAmountMinor: amount,
          percentageBasisPoints: command.dto.percentageBasisPoints,
          formulaReference: command.dto.formulaReference,
          calculationOrder: command.dto.calculationOrder,
          required: command.dto.required,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.salary_structure.component_added',
        entityType: 'SalaryStructureVersionComponent',
        entityId: component.id,
        payload: { salaryStructureVersionId: command.versionId },
      });
      return { data: { id: component.id } };
    });
  }
}

@CommandHandler(RemoveComponentFromSalaryStructureVersionCommand)
export class RemoveComponentFromSalaryStructureVersionHandler implements ICommandHandler<RemoveComponentFromSalaryStructureVersionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: RemoveComponentFromSalaryStructureVersionCommand) {
    return this.prisma.forTenant(async (tx) => {
      const version = await this.repo.findSalaryStructureVersion(
        command.tenantId,
        command.versionId,
        tx,
      );
      if (!version)
        notFound('SALARY_STRUCTURE_NOT_FOUND', 'Salary structure version');
      if (version.status !== PayrollVersionStatus.DRAFT) {
        immutable('SALARY_STRUCTURE_VERSION_IMMUTABLE');
      }
      const component = await this.repo.findStructureComponent(
        command.tenantId,
        command.versionId,
        command.componentVersionId,
        tx,
      );
      if (!component)
        notFound('PAY_COMPONENT_NOT_FOUND', 'Salary structure component');
      await this.repo.removeSalaryStructureComponent(component.id, tx);
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.salary_structure.component_removed',
        entityType: 'SalaryStructureVersionComponent',
        entityId: component.id,
        payload: { salaryStructureVersionId: command.versionId },
      });
      return { data: { id: component.id, status: 'REMOVED' } };
    });
  }
}

@CommandHandler(ActivateSalaryStructureVersionCommand)
export class ActivateSalaryStructureVersionHandler implements ICommandHandler<ActivateSalaryStructureVersionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: ActivateSalaryStructureVersionCommand) {
    return this.prisma.forTenant(async (tx) => {
      const version = await this.repo.findSalaryStructureVersion(
        command.tenantId,
        command.versionId,
        tx,
      );
      if (!version || version.structureId !== command.structureId) {
        notFound('SALARY_STRUCTURE_NOT_FOUND', 'Salary structure version');
      }
      if (version.status === PayrollVersionStatus.ACTIVE) {
        return { data: { id: version.id, status: version.status } };
      }
      if (version.status !== PayrollVersionStatus.DRAFT) {
        immutable('SALARY_STRUCTURE_VERSION_IMMUTABLE');
      }
      if (!version.components.length) {
        throw new UnprocessableEntityException({
          code: 'INVALID_COMPONENT_CONFIGURATION',
          message:
            'Salary structure version must contain at least one component',
        });
      }
      await advisoryLock(
        tx,
        command.tenantId,
        `structure:${command.structureId}`,
      );
      const activated = await this.repo.activateSalaryStructureVersion(
        version.id,
        command.structureId,
        command.actorId,
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.salary_structure.version_activated',
        entityType: 'SalaryStructureVersion',
        entityId: activated.id,
        payload: {
          structureId: activated.structureId,
          version: activated.version,
        },
      });
      return { data: { id: activated.id, status: activated.status } };
    });
  }
}

@CommandHandler(CreateEmployeePayrollProfileCommand)
export class CreateEmployeePayrollProfileHandler implements ICommandHandler<CreateEmployeePayrollProfileCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: CreateEmployeePayrollProfileCommand) {
    const range = rangeFrom(command.dto);
    return this.prisma.forTenant(async (tx) => {
      await assertEmployee(this.repo, command.tenantId, command.employeeId, tx);
      const existing = await this.repo.getEmployeePayrollProfile(
        command.tenantId,
        command.employeeId,
        tx,
      );
      if (existing) {
        throw new ConflictException({
          code: 'EMPLOYEE_PAYROLL_PROFILE_ALREADY_EXISTS',
          message: 'Employee payroll profile already exists',
        });
      }
      if (command.dto.payGroupId) {
        const payGroup = await this.repo.findPayGroup(
          command.tenantId,
          command.dto.payGroupId,
          tx,
        );
        if (!payGroup) notFound('PAY_GROUP_NOT_FOUND', 'Pay group');
      }
      const profile = await this.repo.createEmployeePayrollProfile(
        {
          tenantId: command.tenantId,
          employeeId: command.employeeId,
          payGroupId: command.dto.payGroupId,
          payrollStatus: command.dto.payrollStatus ?? 'ACTIVE',
          payrollCountry: command.dto.payrollCountry,
          paymentMethod: command.dto.paymentMethod ?? 'BANK_TRANSFER',
          salaryHold: command.dto.salaryHold ?? false,
          effectiveFrom: range.effectiveFrom,
          effectiveTo: range.effectiveTo,
          metadata: json(command.dto.metadata ?? {}),
          createdBy: command.actorId,
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.employee_profile.created',
        entityType: 'EmployeePayrollProfile',
        entityId: profile.id,
        payload: {
          employeeId: command.employeeId,
          payGroupId: profile.payGroupId,
        },
      });
      return { data: { id: profile.id, version: profile.version } };
    });
  }
}

@CommandHandler(UpdateEmployeePayrollProfileCommand)
export class UpdateEmployeePayrollProfileHandler implements ICommandHandler<UpdateEmployeePayrollProfileCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: UpdateEmployeePayrollProfileCommand) {
    return this.prisma.forTenant(async (tx) => {
      const profile = await this.repo.getEmployeePayrollProfile(
        command.tenantId,
        command.employeeId,
        tx,
      );
      if (!profile) {
        notFound(
          'EMPLOYEE_PAYROLL_PROFILE_NOT_FOUND',
          'Employee payroll profile',
        );
      }
      if (profile.version !== command.dto.version) versionConflict();
      const range =
        command.dto.effectiveFrom || command.dto.effectiveTo
          ? rangeFrom({
              effectiveFrom:
                command.dto.effectiveFrom ??
                profile.effectiveFrom.toISOString().slice(0, 10),
              effectiveTo: command.dto.effectiveTo ?? undefined,
            })
          : undefined;
      const updated = await this.repo.updateEmployeePayrollProfile(
        profile.id,
        {
          ...stripUndefined({
            payGroupId: command.dto.payGroupId,
            payrollStatus: command.dto.payrollStatus,
            payrollCountry: command.dto.payrollCountry,
            paymentMethod: command.dto.paymentMethod,
            salaryHold: command.dto.salaryHold,
            effectiveFrom: range?.effectiveFrom,
            effectiveTo: range?.effectiveTo,
            metadata: command.dto.metadata
              ? json(command.dto.metadata)
              : undefined,
            updatedBy: command.actorId,
          }),
          version: { increment: 1 },
        },
        tx,
      );
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.employee_profile.updated',
        entityType: 'EmployeePayrollProfile',
        entityId: updated.id,
        payload: { employeeId: command.employeeId, version: updated.version },
      });
      return { data: { id: updated.id, version: updated.version } };
    });
  }
}

@CommandHandler(CreateEmployeeCompensationVersionCommand)
export class CreateEmployeeCompensationVersionHandler implements ICommandHandler<CreateEmployeeCompensationVersionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: CreateEmployeeCompensationVersionCommand) {
    const range = rangeFrom(command.dto);
    const money = MoneyValue.fromMinor(
      command.dto.baseAmountMinor,
      command.dto.currency,
    );
    return this.prisma.forTenant(async (tx) => {
      const profile = await this.repo.getEmployeePayrollProfile(
        command.tenantId,
        command.employeeId,
        tx,
      );
      if (!profile) {
        notFound(
          'EMPLOYEE_PAYROLL_PROFILE_NOT_FOUND',
          'Employee payroll profile',
        );
      }
      const structureVersion = await this.repo.findSalaryStructureVersion(
        command.tenantId,
        command.dto.salaryStructureVersionId,
        tx,
      );
      if (!structureVersion)
        notFound('SALARY_STRUCTURE_NOT_FOUND', 'Salary structure version');
      if (structureVersion.status !== PayrollVersionStatus.ACTIVE) {
        throw new UnprocessableEntityException({
          code: 'SALARY_STRUCTURE_VERSION_IMMUTABLE',
          message:
            'Compensation can only reference an active salary structure version',
        });
      }
      const compensations = await this.repo.listEmployeeCompensations(
        command.tenantId,
        profile.id,
        tx,
      );
      if (compensations.some((item) => rangesOverlap(item, range))) {
        throw new ConflictException({
          code: 'COMPENSATION_VERSION_OVERLAP',
          message: 'Compensation version overlaps an existing period',
        });
      }
      const nextVersion = (compensations[0]?.version ?? 0) + 1;
      const created = (await this.repo.createEmployeeCompensation(
        {
          tenantId: command.tenantId,
          employeePayrollProfileId: profile.id,
          salaryStructureVersionId: command.dto.salaryStructureVersionId,
          baseAmountMinor: money.amountMinor,
          currency: money.currency,
          effectiveFrom: range.effectiveFrom,
          effectiveTo: range.effectiveTo,
          reason: command.dto.reason,
          version: nextVersion,
          createdBy: command.actorId,
        },
        tx,
      )) as { id: string; version: number };
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.employee_compensation.created',
        entityType: 'EmployeeCompensationVersion',
        entityId: created.id,
        payload: {
          employeeId: command.employeeId,
          salaryStructureVersionId: command.dto.salaryStructureVersionId,
          version: created.version,
          reason: command.dto.reason,
        },
      });
      return { data: { id: created.id, version: created.version } };
    });
  }
}

@CommandHandler(EndEmployeeCompensationVersionCommand)
export class EndEmployeeCompensationVersionHandler implements ICommandHandler<EndEmployeeCompensationVersionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PAYROLL_FOUNDATION_REPOSITORY)
    private readonly repo: PayrollFoundationRepository,
  ) {}

  async execute(command: EndEmployeeCompensationVersionCommand) {
    const effectiveTo = parseDateOnly(command.dto.effectiveTo);
    return this.prisma.forTenant(async (tx) => {
      const profile = await this.repo.getEmployeePayrollProfile(
        command.tenantId,
        command.employeeId,
        tx,
      );
      if (!profile) {
        notFound(
          'EMPLOYEE_PAYROLL_PROFILE_NOT_FOUND',
          'Employee payroll profile',
        );
      }
      const compensations = await this.repo.listEmployeeCompensations(
        command.tenantId,
        profile.id,
        tx,
      );
      const compensation = compensations.find(
        (item) => item.id === command.compensationId,
      );
      if (!compensation)
        notFound('EMPLOYEE_PAYROLL_PROFILE_NOT_FOUND', 'Compensation version');
      if (effectiveTo < compensation.effectiveFrom) {
        throw new UnprocessableEntityException({
          code: 'INVALID_EFFECTIVE_DATE_RANGE',
          message: 'Compensation end date must not be before its start date',
        });
      }
      const updated = (await this.repo.updateEmployeeCompensation(
        compensation.id,
        { effectiveTo, endedBy: command.actorId },
        tx,
      )) as { id: string; version: number };
      await record(this.audit, this.outbox, tx, command, {
        action: 'payroll.employee_compensation.ended',
        entityType: 'EmployeeCompensationVersion',
        entityId: updated.id,
        payload: { employeeId: command.employeeId, reason: command.dto.reason },
      });
      return { data: { id: updated.id, status: 'ENDED' } };
    });
  }
}

function rangeFrom(dto: { effectiveFrom: string; effectiveTo?: string }) {
  const range = {
    effectiveFrom: parseDateOnly(dto.effectiveFrom),
    effectiveTo: dto.effectiveTo ? parseDateOnly(dto.effectiveTo) : null,
  };
  assertEffectiveDateRange(range);
  return range;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function assertEmployee(
  repo: PayrollFoundationRepository,
  tenantId: string,
  employeeId: string,
  tx: Parameters<PayrollFoundationRepository['findEmployee']>[2],
) {
  const employee = await repo.findEmployee(tenantId, employeeId, tx);
  if (!employee) {
    throw new NotFoundException({
      code: 'EMPLOYEE_NOT_IN_TENANT',
      message: 'Employee was not found in this workspace',
    });
  }
}

function notFound(code: string, name: string): never {
  throw new NotFoundException({
    code,
    message: `${name} was not found`,
  });
}

function versionConflict(): never {
  throw new ConflictException({
    code: 'VERSION_CONFLICT',
    message: 'The record changed since it was loaded. Refresh and retry.',
  });
}

function immutable(code: string): never {
  throw new ConflictException({
    code,
    message: 'Activated historical versions cannot be modified',
  });
}

async function validatePayGroupReferences(
  tx: PrismaTransaction,
  tenantId: string,
  dto: {
    calendarId?: string;
    overtimePolicyId?: string;
    lossOfPayPolicyId?: string;
    approvalPolicyId?: string;
  },
) {
  if (dto.calendarId) {
    const calendar = await tx.payrollCalendar.findFirst({
      where: { tenantId, id: dto.calendarId },
      select: { id: true },
    });
    if (!calendar) notFound('PAYROLL_CALENDAR_NOT_FOUND', 'Payroll calendar');
  }
  for (const policyId of [dto.overtimePolicyId, dto.lossOfPayPolicyId].filter(
    (id): id is string => Boolean(id),
  )) {
    const policy = await tx.payrollPolicy.findFirst({
      where: { tenantId, id: policyId },
      select: { id: true },
    });
    if (!policy) notFound('PAYROLL_POLICY_NOT_FOUND', 'Payroll policy');
  }
  if (dto.approvalPolicyId) {
    const approvalPolicy = await tx.payrollApprovalPolicy.findFirst({
      where: { tenantId, id: dto.approvalPolicyId },
      select: { id: true },
    });
    if (!approvalPolicy)
      notFound('PAYROLL_APPROVAL_POLICY_NOT_FOUND', 'Payroll approval policy');
  }
}

async function advisoryLock(
  tx: PrismaTransaction,
  tenantId: string,
  key: string,
) {
  if (typeof tx.$executeRaw !== 'function') return;
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${tenantId}), hashtext(${key}))
  `;
}

function safeSettings(value: {
  countryCode: string;
  defaultCurrency: string;
  version: number;
}) {
  return {
    countryCode: value.countryCode,
    defaultCurrency: value.defaultCurrency,
    version: value.version,
  };
}

async function record(
  audit: AuditService,
  outbox: OutboxService,
  tx: Parameters<AuditService['append']>[0],
  command: { tenantId: string; actorId: string },
  input: {
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  },
) {
  await Promise.all([
    audit.append(tx, {
      tenantId: command.tenantId,
      actorUserId: command.actorId,
      action: input.action,
      module: 'payroll',
      entityType: input.entityType,
      entityId: input.entityId,
      newValue: input.payload,
    }),
    outbox.append(tx, {
      tenantId: command.tenantId,
      eventKey: input.action,
      payload: { entityId: input.entityId, ...input.payload },
    }),
  ]);
}

export const PayrollFoundationCommandHandlers = [
  CreatePayrollSettingsHandler,
  UpdatePayrollSettingsHandler,
  CreatePayGroupHandler,
  UpdatePayGroupHandler,
  AssignEmployeeToPayGroupHandler,
  RemoveEmployeeFromPayGroupHandler,
  CreatePayComponentHandler,
  CreatePayComponentVersionHandler,
  ActivatePayComponentVersionHandler,
  CreateSalaryStructureHandler,
  CreateSalaryStructureVersionHandler,
  AddComponentToSalaryStructureVersionHandler,
  RemoveComponentFromSalaryStructureVersionHandler,
  ActivateSalaryStructureVersionHandler,
  CreateEmployeePayrollProfileHandler,
  UpdateEmployeePayrollProfileHandler,
  CreateEmployeeCompensationVersionHandler,
  EndEmployeeCompensationVersionHandler,
];

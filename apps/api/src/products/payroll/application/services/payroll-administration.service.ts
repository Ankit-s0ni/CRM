import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PayrollRecordStatus,
  PayrollVersionStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../../../../platform/audit/public';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { parseDateOnly } from '../../domain/value-objects/effective-date-range';
import {
  PROTECTED_PAYROLL_DATA_CIPHER,
  type ProtectedPayrollDataCipher,
} from '../ports/protected-payroll-data-cipher';
import {
  CreatePayrollAccountingMappingDto,
  CreatePayrollApprovalPolicyDto,
  CreatePayrollApprovalPolicyVersionDto,
  CreatePayrollCalendarDto,
  CreatePayrollCalendarVersionDto,
  CreatePayrollPolicyDto,
  CreatePayrollPolicyVersionDto,
  PayrollAuditQueryDto,
  UpdatePayrollAccountingMappingDto,
  UpdatePayrollApprovalPolicyDto,
  UpdatePayrollCalendarDto,
  UpdatePayrollPolicyDto,
  UpdateProtectedDetailStatusDto,
  UpsertEmployeePaymentDetailDto,
  UpsertEmployeeStatutoryDetailDto,
} from '../dto/payroll-administration.dto';
import {
  assertPayoutDateRule,
  assertPeriodRule,
  assertPolicyConfigForCategory,
} from './payroll-configuration-validation.service';

type Actor = { tenantId: string; userId: string };

@Injectable()
export class PayrollAdministrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(PROTECTED_PAYROLL_DATA_CIPHER)
    private readonly cipher: ProtectedPayrollDataCipher,
  ) {}

  listCalendars(tenantId: string) {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.payrollCalendar.findMany({
        where: { tenantId },
        orderBy: [{ code: 'asc' }, { version: 'desc' }],
      }),
    }));
  }

  getCalendar(tenantId: string, id: string) {
    return this.prisma.forTenant(async (tx) => {
      const item = await tx.payrollCalendar.findFirst({
        where: { tenantId, id },
      });
      if (!item) notFound('PAYROLL_CALENDAR_NOT_FOUND', 'Payroll calendar');
      return { data: item };
    });
  }

  createCalendar(actor: Actor, dto: CreatePayrollCalendarDto) {
    assertPeriodRule(dto.periodStartRule, 'periodStartRule');
    assertPeriodRule(dto.periodEndRule, 'periodEndRule');
    assertPayoutDateRule(dto.payoutDateRule);
    return this.prisma.forTenant(async (tx) => {
      const existing = await tx.payrollCalendar.findFirst({
        where: {
          tenantId: actor.tenantId,
          code: dto.code.toUpperCase(),
          version: 1,
        },
      });
      if (existing) duplicate('PAYROLL_CALENDAR_CODE_ALREADY_EXISTS');
      const item = await tx.payrollCalendar.create({
        data: {
          tenantId: actor.tenantId,
          code: dto.code.toUpperCase(),
          name: dto.name,
          frequency: dto.frequency,
          periodStartRule: json(dto.periodStartRule),
          periodEndRule: json(dto.periodEndRule),
          payoutDateRule: json(dto.payoutDateRule),
          timezone: dto.timezone,
          effectiveFrom: parseDateOnly(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? parseDateOnly(dto.effectiveTo) : null,
          createdBy: actor.userId,
        },
      });
      await this.record(
        tx,
        actor,
        'payroll.calendar.created',
        'PayrollCalendar',
        item.id,
        {
          code: item.code,
          version: item.version,
        },
      );
      return { data: { id: item.id, version: item.version } };
    });
  }

  updateCalendar(actor: Actor, id: string, dto: UpdatePayrollCalendarDto) {
    if (dto.periodStartRule)
      assertPeriodRule(dto.periodStartRule, 'periodStartRule');
    if (dto.periodEndRule) assertPeriodRule(dto.periodEndRule, 'periodEndRule');
    if (dto.payoutDateRule) assertPayoutDateRule(dto.payoutDateRule);
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.payrollCalendar.findFirst({
        where: { tenantId: actor.tenantId, id },
      });
      if (!current) notFound('PAYROLL_CALENDAR_NOT_FOUND', 'Payroll calendar');
      if (current.version !== dto.version) versionConflict();
      const item = await tx.payrollCalendar.update({
        where: { id },
        data: stripUndefined({
          code: dto.code?.toUpperCase(),
          name: dto.name,
          frequency: dto.frequency,
          periodStartRule: dto.periodStartRule
            ? json(dto.periodStartRule)
            : undefined,
          periodEndRule: dto.periodEndRule
            ? json(dto.periodEndRule)
            : undefined,
          payoutDateRule: dto.payoutDateRule
            ? json(dto.payoutDateRule)
            : undefined,
          timezone: dto.timezone,
          effectiveFrom: dto.effectiveFrom
            ? parseDateOnly(dto.effectiveFrom)
            : undefined,
          effectiveTo: dto.effectiveTo
            ? parseDateOnly(dto.effectiveTo)
            : undefined,
          updatedBy: actor.userId,
        }),
      });
      await this.record(
        tx,
        actor,
        'payroll.calendar.updated',
        'PayrollCalendar',
        id,
        {
          code: item.code,
          version: item.version,
        },
      );
      return { data: { id: item.id, version: item.version } };
    });
  }

  createCalendarVersion(
    actor: Actor,
    id: string,
    dto: CreatePayrollCalendarVersionDto,
  ) {
    assertPeriodRule(dto.periodStartRule, 'periodStartRule');
    assertPeriodRule(dto.periodEndRule, 'periodEndRule');
    assertPayoutDateRule(dto.payoutDateRule);
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.payrollCalendar.findFirst({
        where: { tenantId: actor.tenantId, id },
      });
      if (!current) notFound('PAYROLL_CALENDAR_NOT_FOUND', 'Payroll calendar');
      const latest = await tx.payrollCalendar.findFirst({
        where: { tenantId: actor.tenantId, code: current.code },
        orderBy: { version: 'desc' },
      });
      const item = await tx.payrollCalendar.create({
        data: {
          tenantId: actor.tenantId,
          code: current.code,
          name: dto.name,
          frequency: dto.frequency,
          periodStartRule: json(dto.periodStartRule),
          periodEndRule: json(dto.periodEndRule),
          payoutDateRule: json(dto.payoutDateRule),
          timezone: dto.timezone,
          effectiveFrom: parseDateOnly(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? parseDateOnly(dto.effectiveTo) : null,
          version: (latest?.version ?? 0) + 1,
          status: 'DRAFT',
          createdBy: actor.userId,
        },
      });
      await this.record(
        tx,
        actor,
        'payroll.calendar.version_created',
        'PayrollCalendar',
        item.id,
        {
          code: item.code,
          version: item.version,
        },
      );
      return { data: { id: item.id, version: item.version } };
    });
  }

  setCalendarStatus(actor: Actor, id: string, status: PayrollRecordStatus) {
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.payrollCalendar.findFirst({
        where: { tenantId: actor.tenantId, id },
      });
      if (!current) notFound('PAYROLL_CALENDAR_NOT_FOUND', 'Payroll calendar');
      await advisoryLock(tx, actor.tenantId, `calendar:${current.code}`);
      if (status === 'ACTIVE') {
        await tx.payrollCalendar.updateMany({
          where: {
            tenantId: actor.tenantId,
            code: current.code,
            status: 'ACTIVE',
            id: { not: id },
          },
          data: { status: 'INACTIVE', updatedBy: actor.userId },
        });
      }
      const item = await tx.payrollCalendar.update({
        where: { id },
        data: { status, updatedBy: actor.userId },
      });
      await this.record(
        tx,
        actor,
        `payroll.calendar.${status.toLowerCase()}`,
        'PayrollCalendar',
        id,
        {
          code: item.code,
          version: item.version,
        },
      );
      return { data: { id, status: item.status } };
    });
  }

  listPolicies(tenantId: string) {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.payrollPolicy.findMany({
        where: { tenantId },
        include: { versions: { orderBy: { version: 'desc' } } },
        orderBy: { code: 'asc' },
      }),
    }));
  }

  createPolicy(actor: Actor, dto: CreatePayrollPolicyDto) {
    return this.prisma.forTenant(async (tx) => {
      try {
        const item = await tx.payrollPolicy.create({
          data: {
            tenantId: actor.tenantId,
            code: dto.code.toUpperCase(),
            name: dto.name,
            category: dto.category,
            createdBy: actor.userId,
          },
        });
        await this.record(
          tx,
          actor,
          'payroll.policy.created',
          'PayrollPolicy',
          item.id,
          {
            code: item.code,
          },
        );
        return { data: { id: item.id } };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException({
            code: 'POLICY_CODE_EXISTS',
            message: `A policy with code "${dto.code.toUpperCase()}" already exists.`,
          });
        }
        throw error;
      }
    });
  }

  updatePolicy(actor: Actor, id: string, dto: UpdatePayrollPolicyDto) {
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.payrollPolicy.findFirst({
        where: { tenantId: actor.tenantId, id },
      });
      if (!current) notFound('PAYROLL_POLICY_NOT_FOUND', 'Payroll policy');
      const item = await tx.payrollPolicy.update({
        where: { id },
        data: stripUndefined({
          code: dto.code?.toUpperCase(),
          name: dto.name,
          category: dto.category,
          updatedBy: actor.userId,
        }),
      });
      await this.record(
        tx,
        actor,
        'payroll.policy.updated',
        'PayrollPolicy',
        id,
        { code: item.code },
      );
      return { data: { id: item.id } };
    });
  }

  createPolicyVersion(
    actor: Actor,
    policyId: string,
    dto: CreatePayrollPolicyVersionDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const policy = await tx.payrollPolicy.findFirst({
        where: { tenantId: actor.tenantId, id: policyId },
      });
      if (!policy) notFound('PAYROLL_POLICY_NOT_FOUND', 'Payroll policy');
      assertPolicyConfigForCategory(policy.category, dto.config);
      const latest = await tx.payrollPolicyVersion.findFirst({
        where: { tenantId: actor.tenantId, policyId },
        orderBy: { version: 'desc' },
      });
      const item = await tx.payrollPolicyVersion.create({
        data: {
          tenantId: actor.tenantId,
          policyId,
          version: (latest?.version ?? 0) + 1,
          sourceLevel: dto.sourceLevel ?? 'ORGANIZATION',
          sourceEntityId: dto.sourceEntityId,
          supportsOverrides: dto.supportsOverrides ?? true,
          config: json(dto.config),
          effectiveFrom: parseDateOnly(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? parseDateOnly(dto.effectiveTo) : null,
          createdBy: actor.userId,
        },
      });
      await this.record(
        tx,
        actor,
        'payroll.policy.version_created',
        'PayrollPolicyVersion',
        item.id,
        {
          policyId,
          version: item.version,
        },
      );
      return { data: { id: item.id, version: item.version } };
    });
  }

  activatePolicyVersion(actor: Actor, policyId: string, versionId: string) {
    return this.activateVersion(actor, {
      entity: 'PayrollPolicyVersion',
      lockKey: policyId,
      find: (tx) =>
        tx.payrollPolicyVersion.findFirst({
          where: { tenantId: actor.tenantId, id: versionId, policyId },
        }),
      deactivate: (tx) =>
        tx.payrollPolicyVersion.updateMany({
          where: { tenantId: actor.tenantId, policyId, status: 'ACTIVE' },
          data: { status: 'RETIRED' },
        }),
      activate: (tx) =>
        tx.payrollPolicyVersion.update({
          where: { id: versionId },
          data: {
            status: 'ACTIVE',
            activatedAt: new Date(),
            activatedBy: actor.userId,
          },
        }),
      action: 'payroll.policy.version_activated',
    });
  }

  async listPaymentDetails(tenantId: string, employeeId: string) {
    return this.prisma.forTenant(async (tx) => {
      const profile = await this.profile(tx, tenantId, employeeId);
      return {
        data: (
          await tx.employeePaymentDetail.findMany({
            where: { tenantId, employeePayrollProfileId: profile.id },
            orderBy: { version: 'desc' },
          })
        ).map(maskPayment),
      };
    });
  }

  upsertPaymentDetail(
    actor: Actor,
    employeeId: string,
    dto: UpsertEmployeePaymentDetailDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const profile = await this.profile(tx, actor.tenantId, employeeId);
      await advisoryLock(tx, actor.tenantId, `payment:${profile.id}`);
      const latest = await tx.employeePaymentDetail.findFirst({
        where: {
          tenantId: actor.tenantId,
          employeePayrollProfileId: profile.id,
        },
        orderBy: { version: 'desc' },
      });
      const account = dto.accountNumber
        ? await this.cipher.encrypt(dto.accountNumber)
        : undefined;
      const iban = dto.iban ? await this.cipher.encrypt(dto.iban) : undefined;
      const routing = dto.routingNumber
        ? await this.cipher.encrypt(dto.routingNumber)
        : undefined;
      await tx.employeePaymentDetail.updateMany({
        where: {
          tenantId: actor.tenantId,
          employeePayrollProfileId: profile.id,
          status: 'ACTIVE',
        },
        data: { status: 'REPLACED' },
      });
      const item = await tx.employeePaymentDetail.create({
        data: {
          tenantId: actor.tenantId,
          employeePayrollProfileId: profile.id,
          paymentMethod: dto.paymentMethod,
          bankName: dto.bankName,
          accountHolderName: dto.accountHolderName,
          accountNumberCiphertext: account?.ciphertext,
          accountNumberLast4: last4(dto.accountNumber),
          ibanCiphertext: iban?.ciphertext,
          ibanLast4: last4(dto.iban),
          routingCiphertext: routing?.ciphertext,
          routingLast4: last4(dto.routingNumber),
          swiftBic: dto.swiftBic,
          encryptionKeyVersion:
            account?.keyVersion ?? iban?.keyVersion ?? routing?.keyVersion,
          version: (latest?.version ?? 0) + 1,
          updatedBy: actor.userId,
        },
      });
      await this.record(
        tx,
        actor,
        'payroll.protected_payment_detail.upserted',
        'EmployeePaymentDetail',
        item.id,
        {
          employeeId,
          version: item.version,
        },
      );
      return { data: maskPayment(item) };
    });
  }

  async listStatutoryDetails(tenantId: string, employeeId: string) {
    return this.prisma.forTenant(async (tx) => {
      const profile = await this.profile(tx, tenantId, employeeId);
      return {
        data: (
          await tx.employeeStatutoryDetail.findMany({
            where: { tenantId, employeePayrollProfileId: profile.id },
            orderBy: { version: 'desc' },
          })
        ).map(maskStatutory),
      };
    });
  }

  upsertStatutoryDetail(
    actor: Actor,
    employeeId: string,
    dto: UpsertEmployeeStatutoryDetailDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const profile = await this.profile(tx, actor.tenantId, employeeId);
      await advisoryLock(
        tx,
        actor.tenantId,
        `statutory:${profile.id}:${dto.countryCode}:${dto.identifierType}`,
      );
      const latest = await tx.employeeStatutoryDetail.findFirst({
        where: {
          tenantId: actor.tenantId,
          employeePayrollProfileId: profile.id,
          countryCode: dto.countryCode,
          identifierType: dto.identifierType,
        },
        orderBy: { version: 'desc' },
      });
      const identifier = await this.cipher.encrypt(dto.identifier);
      await tx.employeeStatutoryDetail.updateMany({
        where: {
          tenantId: actor.tenantId,
          employeePayrollProfileId: profile.id,
          countryCode: dto.countryCode,
          identifierType: dto.identifierType,
          status: 'ACTIVE',
        },
        data: { status: 'REPLACED' },
      });
      const item = await tx.employeeStatutoryDetail.create({
        data: {
          tenantId: actor.tenantId,
          employeePayrollProfileId: profile.id,
          countryCode: dto.countryCode,
          identifierType: dto.identifierType,
          identifierCiphertext: identifier.ciphertext,
          identifierLast4: last4(dto.identifier),
          encryptionKeyVersion: identifier.keyVersion,
          metadata: json(dto.metadata ?? {}),
          version: (latest?.version ?? 0) + 1,
          updatedBy: actor.userId,
        },
      });
      await this.record(
        tx,
        actor,
        'payroll.protected_statutory_detail.upserted',
        'EmployeeStatutoryDetail',
        item.id,
        {
          employeeId,
          countryCode: item.countryCode,
          identifierType: item.identifierType,
        },
      );
      return { data: maskStatutory(item) };
    });
  }

  setPaymentDetailStatus(
    actor: Actor,
    id: string,
    dto: UpdateProtectedDetailStatusDto,
  ) {
    return this.setProtectedStatus(actor, 'payment', id, dto.status);
  }

  setStatutoryDetailStatus(
    actor: Actor,
    id: string,
    dto: UpdateProtectedDetailStatusDto,
  ) {
    return this.setProtectedStatus(actor, 'statutory', id, dto.status);
  }

  listApprovalPolicies(tenantId: string) {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.payrollApprovalPolicy.findMany({
        where: { tenantId },
        include: { versions: { orderBy: { version: 'desc' } } },
      }),
    }));
  }

  createApprovalPolicy(actor: Actor, dto: CreatePayrollApprovalPolicyDto) {
    return this.prisma.forTenant(async (tx) => {
      try {
        const item = await tx.payrollApprovalPolicy.create({
          data: {
            tenantId: actor.tenantId,
            name: dto.name,
            createdBy: actor.userId,
          },
        });
        await this.record(
          tx,
          actor,
          'payroll.approval_policy.created',
          'PayrollApprovalPolicy',
          item.id,
          { name: item.name },
        );
        return { data: { id: item.id } };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException({
            code: 'APPROVAL_POLICY_EXISTS',
            message:
              'Only one approval policy is allowed per workspace. Use the existing one or edit it.',
          });
        }
        throw error;
      }
    });
  }

  updateApprovalPolicy(
    actor: Actor,
    id: string,
    dto: UpdatePayrollApprovalPolicyDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const item = await tx.payrollApprovalPolicy.findFirst({
        where: { tenantId: actor.tenantId, id },
      });
      if (!item)
        notFound(
          'PAYROLL_APPROVAL_POLICY_NOT_FOUND',
          'Payroll approval policy',
        );
      const updated = await tx.payrollApprovalPolicy.update({
        where: { id },
        data: stripUndefined({ name: dto.name, updatedBy: actor.userId }),
      });
      await this.record(
        tx,
        actor,
        'payroll.approval_policy.updated',
        'PayrollApprovalPolicy',
        id,
        { name: updated.name },
      );
      return { data: { id } };
    });
  }

  createApprovalPolicyVersion(
    actor: Actor,
    approvalPolicyId: string,
    dto: CreatePayrollApprovalPolicyVersionDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const policy = await tx.payrollApprovalPolicy.findFirst({
        where: { tenantId: actor.tenantId, id: approvalPolicyId },
      });
      if (!policy)
        notFound(
          'PAYROLL_APPROVAL_POLICY_NOT_FOUND',
          'Payroll approval policy',
        );
      const latest = await tx.payrollApprovalPolicyVersion.findFirst({
        where: { tenantId: actor.tenantId, approvalPolicyId },
        orderBy: { version: 'desc' },
      });
      const item = await tx.payrollApprovalPolicyVersion.create({
        data: {
          tenantId: actor.tenantId,
          approvalPolicyId,
          version: (latest?.version ?? 0) + 1,
          fourEyesEnabled: dto.fourEyesEnabled,
          makerCanApprove: dto.makerCanApprove,
          requiredLevels: dto.requiredLevels,
          allowedPermissions: dto.allowedPermissions,
          allowedRoleKeys: dto.allowedRoleKeys,
          effectiveFrom: parseDateOnly(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? parseDateOnly(dto.effectiveTo) : null,
          createdBy: actor.userId,
        },
      });
      await this.record(
        tx,
        actor,
        'payroll.approval_policy.version_created',
        'PayrollApprovalPolicyVersion',
        item.id,
        {
          approvalPolicyId,
          version: item.version,
        },
      );
      return { data: { id: item.id, version: item.version } };
    });
  }

  activateApprovalPolicyVersion(
    actor: Actor,
    approvalPolicyId: string,
    versionId: string,
  ) {
    return this.activateVersion(actor, {
      entity: 'PayrollApprovalPolicyVersion',
      lockKey: approvalPolicyId,
      find: (tx) =>
        tx.payrollApprovalPolicyVersion.findFirst({
          where: { tenantId: actor.tenantId, id: versionId, approvalPolicyId },
        }),
      deactivate: (tx) =>
        tx.payrollApprovalPolicyVersion.updateMany({
          where: {
            tenantId: actor.tenantId,
            approvalPolicyId,
            status: 'ACTIVE',
          },
          data: { status: 'RETIRED' },
        }),
      activate: (tx) =>
        tx.payrollApprovalPolicyVersion.update({
          where: { id: versionId },
          data: {
            status: 'ACTIVE',
            activatedAt: new Date(),
            activatedBy: actor.userId,
          },
        }),
      action: 'payroll.approval_policy.version_activated',
    });
  }

  listAccountingMappings(tenantId: string) {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.payrollAccountingMapping.findMany({
        where: { tenantId },
        include: { component: true },
        orderBy: [{ payComponentId: 'asc' }, { version: 'desc' }],
      }),
    }));
  }

  createAccountingMapping(
    actor: Actor,
    dto: CreatePayrollAccountingMappingDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      await this.component(tx, actor.tenantId, dto.payComponentId);
      await advisoryLock(
        tx,
        actor.tenantId,
        `accounting:${dto.payComponentId}`,
      );
      const latest = await tx.payrollAccountingMapping.findFirst({
        where: { tenantId: actor.tenantId, payComponentId: dto.payComponentId },
        orderBy: { version: 'desc' },
      });
      const item = await tx.payrollAccountingMapping.create({
        data: {
          tenantId: actor.tenantId,
          payComponentId: dto.payComponentId,
          debitAccountCode: dto.debitAccountCode,
          creditAccountCode: dto.creditAccountCode,
          costCenterRule: json(dto.costCenterRule),
          effectiveFrom: parseDateOnly(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? parseDateOnly(dto.effectiveTo) : null,
          version: (latest?.version ?? 0) + 1,
          createdBy: actor.userId,
        },
      });
      await this.record(
        tx,
        actor,
        'payroll.accounting_mapping.created',
        'PayrollAccountingMapping',
        item.id,
        {
          payComponentId: item.payComponentId,
          version: item.version,
        },
      );
      return { data: { id: item.id, version: item.version } };
    });
  }

  updateAccountingMapping(
    actor: Actor,
    id: string,
    dto: UpdatePayrollAccountingMappingDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.payrollAccountingMapping.findFirst({
        where: { tenantId: actor.tenantId, id },
      });
      if (!current)
        notFound(
          'PAYROLL_ACCOUNTING_MAPPING_NOT_FOUND',
          'Payroll accounting mapping',
        );
      if (current.version !== dto.version) versionConflict();
      const item = await tx.payrollAccountingMapping.update({
        where: { id },
        data: stripUndefined({
          payComponentId: dto.payComponentId,
          debitAccountCode: dto.debitAccountCode,
          creditAccountCode: dto.creditAccountCode,
          costCenterRule: dto.costCenterRule
            ? json(dto.costCenterRule)
            : undefined,
          effectiveFrom: dto.effectiveFrom
            ? parseDateOnly(dto.effectiveFrom)
            : undefined,
          effectiveTo: dto.effectiveTo
            ? parseDateOnly(dto.effectiveTo)
            : undefined,
          status: dto.status,
          updatedBy: actor.userId,
        }),
      });
      await this.record(
        tx,
        actor,
        'payroll.accounting_mapping.updated',
        'PayrollAccountingMapping',
        id,
        {
          payComponentId: item.payComponentId,
          version: item.version,
        },
      );
      return { data: { id, version: item.version, status: item.status } };
    });
  }

  auditHistory(tenantId: string, query: PayrollAuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return this.prisma.forTenant(async (tx) => {
      const where: Prisma.TenantAuditLogWhereInput = {
        tenantId,
        module: 'payroll',
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId,
        createdAt: stripUndefined({
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        }),
      };
      const [items, total] = await Promise.all([
        tx.tenantAuditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        tx.tenantAuditLog.count({ where }),
      ]);
      return { data: items, meta: { page, limit, total } };
    });
  }

  private async profile(
    tx: PrismaTransaction,
    tenantId: string,
    employeeId: string,
  ) {
    const profile = await tx.employeePayrollProfile.findFirst({
      where: { tenantId, employeeId },
    });
    if (!profile)
      notFound(
        'EMPLOYEE_PAYROLL_PROFILE_NOT_FOUND',
        'Employee payroll profile',
      );
    return profile;
  }

  private async component(tx: PrismaTransaction, tenantId: string, id: string) {
    const component = await tx.payComponent.findFirst({
      where: { tenantId, id },
    });
    if (!component) notFound('PAY_COMPONENT_NOT_FOUND', 'Pay component');
    return component;
  }

  private async setProtectedStatus(
    actor: Actor,
    type: 'payment' | 'statutory',
    id: string,
    status: UpdateProtectedDetailStatusDto['status'],
  ) {
    return this.prisma.forTenant(async (tx) => {
      if (type === 'payment') {
        const current = await tx.employeePaymentDetail.findFirst({
          where: { tenantId: actor.tenantId, id },
        });
        if (!current)
          notFound(
            'PAYROLL_PROTECTED_DETAIL_NOT_FOUND',
            'Protected payroll detail',
          );
        const item = await tx.employeePaymentDetail.update({
          where: { id },
          data: { status, updatedBy: actor.userId },
        });
        await this.record(
          tx,
          actor,
          'payroll.protected_payment_detail.status_updated',
          'EmployeePaymentDetail',
          id,
          { status },
        );
        return { data: maskPayment(item) };
      }
      const current = await tx.employeeStatutoryDetail.findFirst({
        where: { tenantId: actor.tenantId, id },
      });
      if (!current)
        notFound(
          'PAYROLL_PROTECTED_DETAIL_NOT_FOUND',
          'Protected payroll detail',
        );
      const item = await tx.employeeStatutoryDetail.update({
        where: { id },
        data: { status, updatedBy: actor.userId },
      });
      await this.record(
        tx,
        actor,
        'payroll.protected_statutory_detail.status_updated',
        'EmployeeStatutoryDetail',
        id,
        { status },
      );
      return { data: maskStatutory(item) };
    });
  }

  private async activateVersion<
    T extends { id: string; status: PayrollVersionStatus },
  >(
    actor: Actor,
    input: {
      entity: string;
      action: string;
      lockKey?: string;
      find: (tx: PrismaTransaction) => Promise<T | null>;
      deactivate: (tx: PrismaTransaction) => Promise<unknown>;
      activate: (tx: PrismaTransaction) => Promise<T>;
    },
  ) {
    return this.prisma.forTenant(async (tx) => {
      if (input.lockKey) await advisoryLock(tx, actor.tenantId, input.lockKey);
      const current = await input.find(tx);
      if (!current)
        notFound(`${input.entity.toUpperCase()}_NOT_FOUND`, input.entity);
      if (current.status === 'ACTIVE')
        return { data: { id: current.id, status: current.status } };
      if (current.status !== 'DRAFT') versionConflict();
      await input.deactivate(tx);
      const item = await input.activate(tx);
      await this.record(tx, actor, input.action, input.entity, item.id, {
        status: item.status,
      });
      return { data: { id: item.id, status: item.status } };
    });
  }

  private async record(
    tx: PrismaTransaction,
    actor: Actor,
    action: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
  ) {
    await Promise.all([
      this.audit.append(tx, {
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action,
        module: 'payroll',
        entityType,
        entityId,
        newValue: payload,
      }),
      this.outbox.append(tx, {
        tenantId: actor.tenantId,
        eventKey: action,
        payload: { entityId, ...payload },
      }),
    ]);
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

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

function notFound(code: string, name: string): never {
  throw new NotFoundException({ code, message: `${name} was not found` });
}

function duplicate(code: string): never {
  throw new ConflictException({
    code,
    message: 'A matching payroll record already exists',
  });
}

function versionConflict(): never {
  throw new ConflictException({
    code: 'VERSION_CONFLICT',
    message: 'The record changed since it was loaded. Refresh and retry.',
  });
}

function last4(value?: string) {
  return value ? value.replace(/\s+/g, '').slice(-4) : undefined;
}

function maskPayment(value: {
  id: string;
  paymentMethod: string;
  bankName: string | null;
  accountHolderName: string | null;
  accountNumberLast4: string | null;
  ibanLast4?: string | null;
  routingLast4: string | null;
  swiftBic?: string | null;
  status: string;
  version: number;
  updatedAt: Date;
}) {
  return {
    id: value.id,
    paymentMethod: value.paymentMethod,
    bankName: value.bankName,
    accountHolderName: value.accountHolderName,
    accountNumberMasked: value.accountNumberLast4
      ? `****${value.accountNumberLast4}`
      : null,
    ibanMasked: value.ibanLast4 ? `****${value.ibanLast4}` : null,
    routingMasked: value.routingLast4 ? `****${value.routingLast4}` : null,
    swiftBic: value.swiftBic ?? null,
    status: value.status,
    version: value.version,
    updatedAt: value.updatedAt,
  };
}

function maskStatutory(value: {
  id: string;
  countryCode: string;
  identifierType: string;
  identifierLast4: string | null;
  metadata?: unknown;
  status: string;
  version: number;
  updatedAt: Date;
}) {
  return {
    id: value.id,
    countryCode: value.countryCode,
    identifierType: value.identifierType,
    identifierMasked: value.identifierLast4
      ? `****${value.identifierLast4}`
      : null,
    metadata: value.metadata ?? {},
    status: value.status,
    version: value.version,
    updatedAt: value.updatedAt,
  };
}

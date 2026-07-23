import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ConflictException } from '@nestjs/common';
import { EmployeeStatus, EmploymentEventType, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { CreateEmployeeCommand } from './create-employee.command';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EmployeeQuotaService } from '../../employee-quota.service';
import {
  normalizeEmployeeCode,
  normalizeEmployeeName,
  parseDateOnly,
  temporaryEmployeePassword,
} from '../../employee-rules';
import { IEmployeeRepository } from '../../domain/employee.repository.interface';
import { Inject, forwardRef } from '@nestjs/common';
import { EmployeesService } from '../../employees.service';
import { AuditService } from '../../../audit/public';
import { provisionEmployeeLeaveBalances } from '../../../../shared/leave/provision-leave-balances';
import { bumpRuntimeConfigVersion } from '../../../../shared/runtime-config/runtime-config-version';
import { EmployeeCreatedEvent } from '../../domain/events/employee-created.event';

@CommandHandler(CreateEmployeeCommand)
export class CreateEmployeeHandler implements ICommandHandler<CreateEmployeeCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: EmployeeQuotaService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBus,
    @Inject(IEmployeeRepository) private readonly employeeRepository: IEmployeeRepository,
    @Inject(forwardRef(() => EmployeesService)) private readonly employeesService: EmployeesService,
  ) {}

  async execute(command: CreateEmployeeCommand) {
    const { tenantId, dto, createdBy } = command;
    const employeeCode = normalizeEmployeeCode(dto.employeeCode);
    const fullName = normalizeEmployeeName(dto.fullName);
    const email = dto.email.trim().toLowerCase();
    const dateOfJoining = parseDateOnly(dto.dateOfJoining);
    const temporaryPassword = temporaryEmployeePassword(fullName, dto.phone);
    const passwordHash = await argon2.hash(temporaryPassword);

    return this.prisma.forTenant(async (tx) => {
      const quota = await this.quotaService.lockAndAssertCapacity(tx, tenantId);
      
      await this.employeesService.validateRelationships(tx, dto.deptId, dto.designationId, dto.managerId);
      await this.employeesService.ensureUniqueIdentity(tx, employeeCode, dto.phone);

      const existingUser = await tx.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existingUser) {
        throw new ConflictException({
          code: 'EMPLOYEE_EMAIL_EXISTS',
          message: 'An account already exists for this email',
        });
      }
      const employeeRole = await tx.role.findFirst({
        where: { name: 'EMPLOYEE', tenantId },
        select: { id: true },
      });
      if (!employeeRole) {
        throw new ConflictException({
          code: 'EMPLOYEE_ROLE_MISSING',
          message: 'The workspace Employee role is not configured',
        });
      }
      
      const user = await tx.user.create({
        data: {
          tenantId,
          email,
          phone: dto.phone,
          passwordHash,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          roles: { create: { roleId: employeeRole.id } },
        },
      });

      const employee = await this.employeeRepository.create({
        tenantId,
        employeeCode,
        fullName,
        phone: dto.phone,
        userId: user.id,
        workType: dto.workType,
        status: EmployeeStatus.ACTIVE,
        dateOfJoining,
        deptId: dto.deptId,
        designationId: dto.designationId ?? null,
        managerId: dto.managerId ?? null,
      }, tx);

      await tx.employmentEvent.create({
        data: {
          tenantId,
          employeeId: employee.id,
          eventType: EmploymentEventType.JOINED,
          effectiveDate: dateOfJoining,
          createdBy,
          payload: {
            source: 'MANUAL',
            departmentId: employee.deptId,
            designationId: employee.designationId,
          },
        },
      });

      await provisionEmployeeLeaveBalances(tx, tenantId, employee.id, createdBy);
      await this.quotaService.emitThresholdEvents(tx, tenantId, quota);
      await this.auditService.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'organization.employee.created',
        module: 'organization',
        entityType: 'Employee',
        entityId: employee.id,
        newValue: {
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          deptId: employee.deptId,
          designationId: employee.designationId,
          managerId: employee.managerId,
          status: employee.status,
        },
      });
      await bumpRuntimeConfigVersion(tx, tenantId);

      this.eventBus.publish(
        new EmployeeCreatedEvent(tenantId, employee.id, createdBy, { employee, quota })
      );

      return {
        data: employee,
        temporaryCredentials: { email, password: temporaryPassword },
      };
    });
  }
}

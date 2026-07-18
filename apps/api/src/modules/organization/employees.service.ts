import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, EmploymentEventType, Prisma } from '@prisma/client';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import {
  EmployeeSort,
  ListEmployeesQueryDto,
} from './dto/list-employees-query.dto';
import {
  ReactivateEmployeeDto,
  TerminateEmployeeDto,
} from './dto/terminate-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQuotaService } from './employee-quota.service';
import { collectReportingEmployeeIds } from './employee-access';
import {
  assertCanReactivate,
  assertCanTerminate,
  assertEmploymentDates,
  assertNoManagerCycle,
  normalizeEmployeeCode,
  normalizeEmployeeName,
  parseDateOnly,
} from './employee-rules';
import { bumpRuntimeConfigVersion } from '../runtime-config/runtime-config-version';
import { synchronizeSubscriptionSeats } from '../billing/application/seat-sync';

const EMPLOYEE_RELATIONS = {
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  manager: { select: { id: true, employeeCode: true, fullName: true } },
} satisfies Prisma.EmployeeInclude;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
    private readonly quotaService: EmployeeQuotaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListEmployeesQueryDto, userId: string) {
    const tenantId = this.requireTenantId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const search = query.search?.trim();
    const where: Prisma.EmployeeWhereInput = {
      status: query.status,
      workType: query.workType,
      deptId: query.departmentId,
      designationId: query.designationId,
      managerId: query.managerId,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { employeeCode: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    return this.prisma.forTenant(async (tx) => {
      const accessibleIds = await this.accessibleEmployeeIds(tx, userId);
      const scopedWhere: Prisma.EmployeeWhereInput = accessibleIds
        ? { AND: [where, { id: { in: accessibleIds } }] }
        : where;
      const data = await tx.employee.findMany({
        where: scopedWhere,
        include: EMPLOYEE_RELATIONS,
        orderBy: this.orderBy(query.sort),
        skip: (page - 1) * limit,
        take: limit,
      });
      const total = await tx.employee.count({ where: scopedWhere });
      const quota = await this.quotaService.getSnapshot(tx, tenantId);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
        quota: this.quotaService.toResponse(quota),
      };
    });
  }

  async getById(id: string, userId: string) {
    const employee = await this.prisma.forTenant(async (tx) => {
      const accessibleIds = await this.accessibleEmployeeIds(tx, userId);
      if (accessibleIds && !accessibleIds.includes(id)) return null;
      return tx.employee.findUnique({
        where: { id },
        include: {
          ...EMPLOYEE_RELATIONS,
          _count: { select: { reports: true } },
        },
      });
    });

    if (!employee) this.throwNotFound();
    return { data: employee };
  }

  async me(userId: string) {
    const employee = await this.prisma.forTenant((tx) =>
      tx.employee.findUnique({
        where: { userId },
        include: {
          ...EMPLOYEE_RELATIONS,
          officeAssignments: {
            where: { isPrimary: true },
            take: 1,
            include: {
              office: {
                select: { id: true, officeName: true, timezone: true },
              },
            },
          },
        },
      }),
    );
    if (!employee) this.throwNotFound();
    return { data: employee };
  }

  async nextCode() {
    const employees = await this.prisma.forTenant((tx) =>
      tx.employee.findMany({ select: { employeeCode: true } }),
    );
    const largest = employees.reduce((max, { employeeCode }) => {
      const match = /^EMP-(\d+)$/i.exec(employeeCode);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return {
      data: { employeeCode: `EMP-${String(largest + 1).padStart(4, '0')}` },
    };
  }

  async quota() {
    const tenantId = this.requireTenantId();
    const quota = await this.prisma.forTenant((tx) =>
      this.quotaService.getSnapshot(tx, tenantId),
    );
    return { data: this.quotaService.toResponse(quota) };
  }

  async create(dto: CreateEmployeeDto, createdBy: string) {
    const tenantId = this.requireTenantId();
    const employeeCode = normalizeEmployeeCode(dto.employeeCode);
    const fullName = normalizeEmployeeName(dto.fullName);
    const dateOfJoining = parseDateOnly(dto.dateOfJoining);

    return this.prisma.forTenant(async (tx) => {
      const quota = await this.quotaService.lockAndAssertCapacity(tx, tenantId);
      await this.validateRelationships(
        tx,
        dto.deptId,
        dto.designationId,
        dto.managerId,
      );
      await this.ensureUniqueIdentity(tx, employeeCode, dto.phone);

      const employee = await tx.employee.create({
        data: {
          tenantId,
          employeeCode,
          fullName,
          phone: dto.phone ?? null,
          workType: dto.workType,
          status: EmployeeStatus.ACTIVE,
          dateOfJoining,
          deptId: dto.deptId,
          designationId: dto.designationId ?? null,
          managerId: dto.managerId ?? null,
        },
        include: EMPLOYEE_RELATIONS,
      });

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
      await synchronizeSubscriptionSeats(
        tx,
        tenantId,
        `employee-created:${employee.id}`,
        createdBy,
      );

      return { data: employee };
    });
  }

  async update(id: string, dto: UpdateEmployeeDto, createdBy: string) {
    const changes = Object.keys(dto).filter((key) => key !== 'effectiveDate');
    if (changes.length === 0) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'At least one employee field must be provided',
      });
    }

    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id } });
      if (!employee) this.throwNotFound();

      const employeeCode = dto.employeeCode
        ? normalizeEmployeeCode(dto.employeeCode)
        : employee.employeeCode;
      const dateOfJoining = dto.dateOfJoining
        ? parseDateOnly(dto.dateOfJoining)
        : employee.dateOfJoining;
      assertEmploymentDates(dateOfJoining, employee.dateOfExit);

      const deptId = dto.deptId ?? employee.deptId;
      const designationId =
        dto.designationId === undefined
          ? employee.designationId
          : dto.designationId;
      const managerId =
        dto.managerId === undefined ? employee.managerId : dto.managerId;

      await this.validateRelationships(tx, deptId, designationId, managerId);
      await this.ensureUniqueIdentity(
        tx,
        employeeCode,
        dto.phone === undefined ? employee.phone : dto.phone,
        id,
      );

      if (managerId !== employee.managerId) {
        const graph = await tx.employee.findMany({
          select: { id: true, managerId: true },
        });
        assertNoManagerCycle(id, managerId, graph);
      }

      const updated = await tx.employee.update({
        where: { id },
        data: {
          employeeCode,
          fullName: dto.fullName
            ? normalizeEmployeeName(dto.fullName)
            : employee.fullName,
          phone: dto.phone === undefined ? employee.phone : dto.phone,
          workType: dto.workType ?? employee.workType,
          dateOfJoining,
          deptId,
          designationId,
          managerId,
        },
        include: EMPLOYEE_RELATIONS,
      });

      const effectiveDate = dto.effectiveDate
        ? parseDateOnly(dto.effectiveDate)
        : new Date();
      if (deptId !== employee.deptId) {
        await this.writeEvent(tx, {
          tenantId,
          employeeId: id,
          eventType: EmploymentEventType.TRANSFERRED,
          effectiveDate,
          createdBy,
          payload: {
            fromDepartmentId: employee.deptId,
            toDepartmentId: deptId,
          },
        });
      }
      if (designationId !== employee.designationId) {
        await this.writeEvent(tx, {
          tenantId,
          employeeId: id,
          eventType: EmploymentEventType.PROMOTED,
          effectiveDate,
          createdBy,
          payload: {
            fromDesignationId: employee.designationId,
            toDesignationId: designationId,
          },
        });
      }
      await this.auditService.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'organization.employee.updated',
        module: 'organization',
        entityType: 'Employee',
        entityId: id,
        oldValue: {
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          deptId: employee.deptId,
          designationId: employee.designationId,
          managerId: employee.managerId,
        },
        newValue: {
          employeeCode: updated.employeeCode,
          fullName: updated.fullName,
          deptId: updated.deptId,
          designationId: updated.designationId,
          managerId: updated.managerId,
        },
      });
      if (dto.workType !== undefined || dto.deptId !== undefined) {
        await bumpRuntimeConfigVersion(tx, tenantId);
      }

      return { data: updated };
    });
  }

  async terminate(id: string, dto: TerminateEmployeeDto, createdBy: string) {
    const tenantId = this.requireTenantId();
    const exitDate = parseDateOnly(dto.exitDate);

    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id } });
      if (!employee) this.throwNotFound();
      assertCanTerminate(employee.status);
      assertEmploymentDates(employee.dateOfJoining, exitDate);

      const updated = await tx.employee.update({
        where: { id },
        data: { status: EmployeeStatus.TERMINATED, dateOfExit: exitDate },
        include: EMPLOYEE_RELATIONS,
      });
      await this.writeEvent(tx, {
        tenantId,
        employeeId: id,
        eventType: EmploymentEventType.EXITED,
        effectiveDate: exitDate,
        createdBy,
        payload: { reason: dto.reason ?? null },
      });
      await this.auditService.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'organization.employee.terminated',
        module: 'organization',
        entityType: 'Employee',
        entityId: id,
        oldValue: { status: employee.status, dateOfExit: employee.dateOfExit },
        newValue: { status: updated.status, dateOfExit: updated.dateOfExit },
      });
      await bumpRuntimeConfigVersion(tx, tenantId);
      await synchronizeSubscriptionSeats(
        tx,
        tenantId,
        `employee-terminated:${employee.id}:${exitDate.toISOString()}`,
        createdBy,
      );

      return { data: updated };
    });
  }

  async reactivate(id: string, dto: ReactivateEmployeeDto, createdBy: string) {
    const tenantId = this.requireTenantId();
    const effectiveDate = dto.effectiveDate
      ? parseDateOnly(dto.effectiveDate)
      : new Date();

    return this.prisma.forTenant(async (tx) => {
      const quota = await this.quotaService.lockAndAssertCapacity(tx, tenantId);
      const employee = await tx.employee.findUnique({ where: { id } });
      if (!employee) this.throwNotFound();
      assertCanReactivate(employee.status);

      const updated = await tx.employee.update({
        where: { id },
        data: { status: EmployeeStatus.ACTIVE, dateOfExit: null },
        include: EMPLOYEE_RELATIONS,
      });
      await this.writeEvent(tx, {
        tenantId,
        employeeId: id,
        eventType: EmploymentEventType.JOINED,
        effectiveDate,
        createdBy,
        payload: {
          reactivation: true,
          previousExitDate:
            employee.dateOfExit?.toISOString().slice(0, 10) ?? null,
        },
      });
      await this.quotaService.emitThresholdEvents(tx, tenantId, quota);
      await this.auditService.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'organization.employee.reactivated',
        module: 'organization',
        entityType: 'Employee',
        entityId: id,
        oldValue: { status: employee.status, dateOfExit: employee.dateOfExit },
        newValue: { status: updated.status, dateOfExit: null },
      });
      await bumpRuntimeConfigVersion(tx, tenantId);
      await synchronizeSubscriptionSeats(
        tx,
        tenantId,
        `employee-reactivated:${employee.id}:${effectiveDate.toISOString()}`,
        createdBy,
      );

      return { data: updated };
    });
  }

  async history(id: string, userId: string) {
    return this.prisma.forTenant(async (tx) => {
      const accessibleIds = await this.accessibleEmployeeIds(tx, userId);
      if (accessibleIds && !accessibleIds.includes(id)) this.throwNotFound();
      const employee = await tx.employee.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!employee) this.throwNotFound();

      const data = await tx.employmentEvent.findMany({
        where: { employeeId: id },
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
      });
      return { data };
    });
  }

  private async validateRelationships(
    tx: PrismaTransaction,
    deptId: string,
    designationId?: string | null,
    managerId?: string | null,
  ) {
    const department = await tx.department.findUnique({
      where: { id: deptId },
      select: { id: true },
    });
    const designation = designationId
      ? await tx.designation.findUnique({
          where: { id: designationId },
          select: { id: true },
        })
      : null;
    const manager = managerId
      ? await tx.employee.findUnique({
          where: { id: managerId },
          select: { id: true },
        })
      : null;

    if (!department) {
      throw new NotFoundException({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'Department not found',
      });
    }
    if (designationId && !designation) {
      throw new NotFoundException({
        code: 'DESIGNATION_NOT_FOUND',
        message: 'Designation not found',
      });
    }
    if (managerId && !manager) this.throwNotFound('Manager not found');
  }

  private async accessibleEmployeeIds(
    tx: PrismaTransaction,
    userId: string,
  ): Promise<string[] | null> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        employee: { select: { id: true } },
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return [];

    const permissions = new Set(
      user.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.key),
      ),
    );
    if (permissions.has(PERMISSIONS.EMPLOYEES_READ)) return null;
    if (!user.employee) return [];

    if (permissions.has(PERMISSIONS.EMPLOYEES_REPORTS_READ)) {
      const employees = await tx.employee.findMany({
        select: { id: true, managerId: true },
      });
      return collectReportingEmployeeIds(user.employee.id, employees);
    }
    if (permissions.has(PERMISSIONS.EMPLOYEES_SELF_READ)) {
      return [user.employee.id];
    }
    return [];
  }

  private async ensureUniqueIdentity(
    tx: PrismaTransaction,
    employeeCode: string,
    phone?: string | null,
    excludeId?: string,
  ) {
    const codeMatch = await tx.employee.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        employeeCode: { equals: employeeCode, mode: 'insensitive' },
      },
      select: { id: true },
    });
    const phoneMatch = phone
      ? await tx.employee.findFirst({
          where: {
            id: excludeId ? { not: excludeId } : undefined,
            phone,
          },
          select: { id: true },
        })
      : null;

    if (codeMatch) {
      throw new ConflictException({
        code: 'EMPLOYEE_CODE_TAKEN',
        message: 'Employee code already exists',
      });
    }
    if (phoneMatch) {
      throw new ConflictException({
        code: 'EMPLOYEE_PHONE_TAKEN',
        message: 'Employee phone number already exists',
      });
    }
  }

  private writeEvent(
    tx: PrismaTransaction,
    data: Prisma.EmploymentEventUncheckedCreateInput,
  ) {
    return tx.employmentEvent.create({ data });
  }

  private orderBy(
    sort = EmployeeSort.NAME_ASC,
  ): Prisma.EmployeeOrderByWithRelationInput {
    const values: Record<
      EmployeeSort,
      Prisma.EmployeeOrderByWithRelationInput
    > = {
      [EmployeeSort.NAME_ASC]: { fullName: 'asc' },
      [EmployeeSort.NAME_DESC]: { fullName: 'desc' },
      [EmployeeSort.CODE_ASC]: { employeeCode: 'asc' },
      [EmployeeSort.CODE_DESC]: { employeeCode: 'desc' },
      [EmployeeSort.JOINED_ASC]: { dateOfJoining: 'asc' },
      [EmployeeSort.JOINED_DESC]: { dateOfJoining: 'desc' },
    };
    return values[sort];
  }

  private requireTenantId() {
    const tenantId = this.tenantContextService.tenantId;
    if (!tenantId) {
      throw new BadRequestException({
        code: 'WORKSPACE_HEADER_REQUIRED',
        message: 'Workspace header required',
      });
    }
    return tenantId;
  }

  private throwNotFound(message = 'Employee not found'): never {
    throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message });
  }
}

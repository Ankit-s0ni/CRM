import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeStatus,
  EmploymentEventType,
  Prisma,
  UserStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { AuditService } from '../audit/public';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { TenantContextService } from '../tenancy/public';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import {
  EmployeeQuickFilter,
  EmployeeSort,
  ListEmployeesQueryDto,
} from './dto/list-employees-query.dto';
import {
  ReactivateEmployeeDto,
  TerminateEmployeeDto,
} from './dto/terminate-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeeAssignmentsDto } from './dto/update-employee-assignments.dto';
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
  temporaryEmployeePassword,
} from './employee-rules';
import { bumpRuntimeConfigVersion } from '../../shared/runtime-config/runtime-config-version';
import { synchronizeSubscriptionSeats } from '../billing/public';
import { provisionEmployeeLeaveBalances } from '../../shared/leave/provision-leave-balances';

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
    const now = new Date();
    const inThirtyDays = new Date(now.getTime() + 30 * 86_400_000);
    const where: Prisma.EmployeeWhereInput = {
      status: query.status,
      workType: query.workType,
      deptId: query.departmentId,
      designationId: query.designationId,
      managerId: query.managerId,
      ...(query.quickFilter === EmployeeQuickFilter.JOINING_SOON
        ? {
            status: EmployeeStatus.ACTIVE,
            dateOfJoining: { gt: now, lte: inThirtyDays },
          }
        : {}),
      ...(query.quickFilter === EmployeeQuickFilter.MISSING_MANAGER
        ? {
            status: { not: EmployeeStatus.TERMINATED },
            managerId: null,
          }
        : {}),
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

  async workspace(id: string, userId: string, permissions: Set<string>) {
    const tenantId = this.requireTenantId();
    const canReadAttendance = [
      PERMISSIONS.ATTENDANCE_RECORDS_READ,
      PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ,
    ].some((permission) => permissions.has(permission));
    const canReadLeave = [
      PERMISSIONS.LEAVE_SELF,
      PERMISSIONS.LEAVE_APPROVE,
      PERMISSIONS.LEAVE_MANAGE,
    ].some((permission) => permissions.has(permission));
    const canReadDevices = [
      PERMISSIONS.ATTENDANCE_DEVICES_READ,
      PERMISSIONS.ATTENDANCE_DEVICES_MANAGE,
    ].some((permission) => permissions.has(permission));
    const workspace = await this.prisma.forTenant(async (tx) => {
      const accessibleIds = await this.accessibleEmployeeIds(tx, userId);
      if (accessibleIds && !accessibleIds.includes(id)) return null;

      const employee = await tx.employee.findUnique({
        where: { id },
        include: {
          ...EMPLOYEE_RELATIONS,
          user: {
            select: {
              id: true,
              email: true,
              status: true,
              emailVerifiedAt: true,
              lastLoginAt: true,
              roles: {
                select: { role: { select: { id: true, name: true } } },
              },
            },
          },
          defaultShift: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
              isOvernight: true,
            },
          },
          officeAssignments: {
            include: {
              office: {
                select: {
                  id: true,
                  officeName: true,
                  timezone: true,
                  radiusMeters: true,
                },
              },
            },
            orderBy: { isPrimary: 'desc' },
          },
        },
      });
      if (!employee) return null;

      const [
        policyAssignments,
        rosters,
        attendance,
        leaveBalances,
        leaveRequests,
        devices,
        employmentEvents,
        audit,
      ] = await Promise.all([
        canReadAttendance
          ? tx.policyAssignment.findMany({
              where: {
                OR: [
                  { employeeId: id },
                  { deptId: employee.deptId },
                  { scope: 'TENANT_DEFAULT' },
                ],
              },
              include: {
                policy: {
                  select: {
                    id: true,
                    name: true,
                    locationMode: true,
                    selfieMode: true,
                    requireFaceMatch: true,
                    requireRegisteredDevice: true,
                    requireGeofence: true,
                    fieldTrackingEnabled: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
        canReadAttendance
          ? tx.employeeShiftRoster.findMany({
              where: { employeeId: id },
              include: {
                shift: {
                  select: {
                    id: true,
                    name: true,
                    startTime: true,
                    endTime: true,
                    isOvernight: true,
                  },
                },
              },
              orderBy: { rosterDate: 'desc' },
              take: 14,
            })
          : Promise.resolve([]),
        canReadAttendance
          ? tx.attendanceLog.findMany({
              where: { employeeId: id },
              select: {
                id: true,
                attendanceDate: true,
                attendanceStatus: true,
                firstCheckin: true,
                lastCheckout: true,
                totalWorkMinutes: true,
                lateMinutes: true,
                overtimeMinutes: true,
                resolvedExceptionId: true,
              },
              orderBy: { attendanceDate: 'desc' },
              take: 14,
            })
          : Promise.resolve([]),
        canReadLeave
          ? tx.leaveBalance.findMany({
              where: { employeeId: id },
              select: {
                id: true,
                remainingDays: true,
                updatedAt: true,
                policy: {
                  select: {
                    id: true,
                    name: true,
                    leaveType: true,
                    version: true,
                  },
                },
              },
              orderBy: { policy: { name: 'asc' } },
            })
          : Promise.resolve([]),
        canReadLeave
          ? tx.leaveRequest.findMany({
              where: { employeeId: id },
              select: {
                id: true,
                startDate: true,
                endDate: true,
                totalDays: true,
                status: true,
                reason: true,
                createdAt: true,
                policy: { select: { id: true, name: true, leaveType: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            })
          : Promise.resolve([]),
        canReadDevices
          ? tx.registeredDevice.findMany({
              where: { employeeId: id },
              select: {
                id: true,
                platform: true,
                deviceModel: true,
                osVersion: true,
                appVersion: true,
                status: true,
                isPrimary: true,
                registeredAt: true,
                lastSeenAt: true,
              },
              orderBy: { registeredAt: 'desc' },
            })
          : Promise.resolve([]),
        tx.employmentEvent.findMany({
          where: { employeeId: id },
          orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
          take: 20,
        }),
        tx.tenantAuditLog.findMany({
          where: { tenantId, entityId: id },
          select: {
            id: true,
            action: true,
            module: true,
            actorUserId: true,
            requestId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

      const effectivePolicy =
        policyAssignments.find(
          ({ scope, employeeId }) => scope === 'EMPLOYEE' && employeeId === id,
        ) ??
        policyAssignments.find(
          ({ scope, deptId }) =>
            scope === 'DEPARTMENT' && deptId === employee.deptId,
        ) ??
        policyAssignments.find(({ scope }) => scope === 'TENANT_DEFAULT') ??
        null;

      return {
        employee,
        assignments: {
          offices: employee.officeAssignments,
          defaultShift: employee.defaultShift,
          upcomingRosters: rosters,
          effectiveAttendancePolicy: effectivePolicy,
          policyResolution: effectivePolicy?.scope ?? null,
        },
        attendance: {
          recentDays: attendance,
          resolvedExceptionCount: attendance.filter(
            ({ resolvedExceptionId }) => resolvedExceptionId,
          ).length,
        },
        leave: { balances: leaveBalances, recentRequests: leaveRequests },
        devices,
        history: { employmentEvents, audit },
        readiness: {
          accountLinked: Boolean(employee.user),
          managerAssigned: Boolean(employee.managerId),
          officeAssigned: employee.officeAssignments.length > 0,
          shiftAssigned: Boolean(employee.defaultShift) || rosters.length > 0,
          attendancePolicyAssigned: Boolean(effectivePolicy),
          approvedDevice: devices.some(({ status }) => status === 'ACTIVE'),
        },
      };
    });

    if (!workspace) this.throwNotFound();
    return { data: workspace };
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
    const email = dto.email.trim().toLowerCase();
    const dateOfJoining = parseDateOnly(dto.dateOfJoining);
    const temporaryPassword = temporaryEmployeePassword(fullName, dto.phone);
    const passwordHash = await argon2.hash(temporaryPassword);

    return this.prisma.forTenant(async (tx) => {
      const quota = await this.quotaService.lockAndAssertCapacity(tx, tenantId);
      await this.validateRelationships(
        tx,
        dto.deptId,
        dto.designationId,
        dto.managerId,
      );
      await this.ensureUniqueIdentity(tx, employeeCode, dto.phone);
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

      const employee = await tx.employee.create({
        data: {
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
      await provisionEmployeeLeaveBalances(
        tx,
        tenantId,
        employee.id,
        createdBy,
      );
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

      return {
        data: employee,
        temporaryCredentials: { email, password: temporaryPassword },
      };
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

      const currentUser = employee.userId
        ? await tx.user.findUnique({ where: { id: employee.userId } })
        : null;
      const email = dto.email?.trim().toLowerCase();
      if (email && email !== currentUser?.email.toLowerCase()) {
        const existingUser = await tx.user.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
            id: currentUser ? { not: currentUser.id } : undefined,
          },
          select: { id: true },
        });
        if (existingUser) {
          throw new ConflictException({
            code: 'EMPLOYEE_EMAIL_EXISTS',
            message: 'An account already exists for this email',
          });
        }
        if (!currentUser) {
          throw new ConflictException({
            code: 'EMPLOYEE_ACCOUNT_MISSING',
            message: 'Create this employee login before setting an email',
          });
        }
        await tx.user.update({
          where: { id: currentUser.id },
          data: { email },
        });
      }

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
          email: currentUser?.email ?? null,
          deptId: employee.deptId,
          designationId: employee.designationId,
          managerId: employee.managerId,
        },
        newValue: {
          employeeCode: updated.employeeCode,
          fullName: updated.fullName,
          email: email ?? currentUser?.email ?? null,
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

  async createAccount(id: string, inputEmail: string, createdBy: string) {
    const tenantId = this.requireTenantId();
    const email = inputEmail.trim().toLowerCase();

    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id } });
      if (!employee) this.throwNotFound();
      if (employee.userId) {
        throw new ConflictException({
          code: 'EMPLOYEE_ACCOUNT_EXISTS',
          message: 'This employee already has a login account',
        });
      }
      if (!employee.phone) {
        throw new BadRequestException({
          code: 'EMPLOYEE_PHONE_REQUIRED',
          message: 'Add an employee phone number before creating the login',
        });
      }

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

      const temporaryPassword = temporaryEmployeePassword(
        employee.fullName,
        employee.phone,
      );
      const user = await tx.user.create({
        data: {
          tenantId,
          email,
          phone: employee.phone,
          passwordHash: await argon2.hash(temporaryPassword),
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          roles: { create: { roleId: employeeRole.id } },
        },
      });
      await tx.employee.update({
        where: { id },
        data: { userId: user.id },
      });
      await this.auditService.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'organization.employee.account-created',
        module: 'organization',
        entityType: 'Employee',
        entityId: employee.id,
        newValue: { email },
      });

      return {
        data: { userId: user.id, email },
        temporaryCredentials: { email, password: temporaryPassword },
      };
    });
  }

  async updateAssignments(
    id: string,
    dto: UpdateEmployeeAssignmentsDto,
    createdBy: string,
  ) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id },
        include: { officeAssignments: true },
      });
      if (!employee) this.throwNotFound();

      // Update default shift
      if (dto.defaultShiftId !== undefined) {
        if (dto.defaultShiftId) {
          const shift = await tx.shift.findUnique({
            where: { id: dto.defaultShiftId, tenantId },
          });
          if (!shift) {
            throw new BadRequestException('Shift not found in this workspace');
          }
        }
        await tx.employee.update({
          where: { id },
          data: { defaultShiftId: dto.defaultShiftId },
        });
      }

      // Update primary office
      if (dto.primaryOfficeId !== undefined) {
        if (dto.primaryOfficeId) {
          const office = await tx.officeLocation.findUnique({
            where: { id: dto.primaryOfficeId, tenantId },
          });
          if (!office) {
            throw new BadRequestException('Office not found in this workspace');
          }

          // Unset all existing primary offices
          await tx.employeeOfficeAssignment.updateMany({
            where: { employeeId: id },
            data: { isPrimary: false },
          });

          // Upsert the new primary office
          await tx.employeeOfficeAssignment.upsert({
            where: {
              tenantId_employeeId_officeLocationId: {
                tenantId,
                employeeId: id,
                officeLocationId: dto.primaryOfficeId,
              },
            },
            create: {
              tenantId,
              employeeId: id,
              officeLocationId: dto.primaryOfficeId,
              isPrimary: true,
            },
            update: {
              isPrimary: true,
            },
          });
        } else {
          // Unset primary
          await tx.employeeOfficeAssignment.updateMany({
            where: { employeeId: id },
            data: { isPrimary: false },
          });
        }
      }

      await this.audit.record(tx, {
        tenantId,
        action: 'employee_assignments.updated',
        resourceType: 'EMPLOYEE',
        resourceId: id,
        actorUserId: createdBy,
        metadata: {
          employeeCode: employee.employeeCode,
          defaultShiftId: dto.defaultShiftId,
          primaryOfficeId: dto.primaryOfficeId,
        },
      });

      return {
        id,
        updated: true,
      };
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
      await provisionEmployeeLeaveBalances(tx, tenantId, updated.id, createdBy);
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

  async validateRelationships(
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

  async ensureUniqueIdentity(
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

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LeaveBalanceEntryType, Prisma, RequestStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../../shared/audit/audit.service';
import {
  PrismaService,
  PrismaTransaction,
} from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { assertAttendanceRangeUnlocked } from '../../shared/attendance/attendance-lock';
import {
  CreateLeavePolicyDto,
  CreateLeaveRequestDto,
  AdjustLeaveBalanceDto,
  LeaveBalanceQueryDto,
  LeaveDecisionDto,
  LeaveRequestQueryDto,
  UpdateLeavePolicyDto,
} from './dto/leave.dto';
import { provisionEmployeeLeaveBalances } from '../../shared/leave/provision-leave-balances';

const MANAGE = 'leave.manage';
const APPROVE = 'leave.approve';

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  listPolicies() {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.leavePolicy.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
    }));
  }

  createPolicy(dto: CreateLeavePolicyDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const policy = await tx.leavePolicy.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          leaveType: dto.leaveType.trim().toUpperCase(),
          accrualLogic: policyLogic(dto),
        },
      });
      const employees = await tx.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      for (const employee of employees) {
        const balance = await tx.leaveBalance.create({
          data: {
            tenantId,
            employeeId: employee.id,
            policyId: policy.id,
            remainingDays: dto.annualEntitlement,
          },
        });
        await tx.leaveBalanceLedger.create({
          data: {
            tenantId,
            balanceId: balance.id,
            entryType: LeaveBalanceEntryType.CREDIT,
            days: dto.annualEntitlement,
            balanceAfter: dto.annualEntitlement,
            reason: 'Initial policy entitlement',
            actorUserId: this.userId(),
            idempotencyKey: `policy:${policy.id}:employee:${employee.id}:initial`,
          },
        });
      }
      await this.record(tx, 'policy.created', policy.id, {
        policyId: policy.id,
        name: policy.name,
      });
      return { data: policy };
    });
  }

  updatePolicy(id: string, dto: UpdateLeavePolicyDto) {
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.leavePolicy.findUnique({ where: { id } });
      if (!current) this.notFound('LEAVE_POLICY_NOT_FOUND', 'Leave policy');
      const currentLogic = jsonObject(current.accrualLogic);
      const policy = await tx.leavePolicy.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          leaveType: dto.leaveType?.trim().toUpperCase(),
          isActive: dto.isActive,
          version: { increment: 1 },
          accrualLogic:
            dto.annualEntitlement !== undefined ||
            dto.carryForwardLimit !== undefined ||
            dto.accrualLogic
              ? ({
                  ...currentLogic,
                  ...dto.accrualLogic,
                  annualEntitlement:
                    dto.annualEntitlement ?? currentLogic.annualEntitlement,
                  carryForwardLimit:
                    dto.carryForwardLimit ??
                    currentLogic.carryForwardLimit ??
                    0,
                } as Prisma.InputJsonObject)
              : undefined,
        },
      });
      await this.record(tx, 'policy.updated', id, {
        policyId: id,
        version: policy.version,
      });
      return { data: policy };
    });
  }

  balancesMine() {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.currentEmployee(tx);
      await provisionEmployeeLeaveBalances(
        tx,
        this.tenantId(),
        employee.id,
        this.userId(),
      );
      return {
        data: await tx.leaveBalance.findMany({
          where: { employeeId: employee.id },
          include: { policy: true },
          orderBy: { policy: { name: 'asc' } },
        }),
      };
    });
  }

  adjustBalance(id: string, dto: AdjustLeaveBalanceDto) {
    return this.prisma.forTenant(async (tx) => {
      await this.lockBalance(tx, id);
      const current = await tx.leaveBalance.findUnique({ where: { id } });
      if (!current) this.notFound('LEAVE_BALANCE_NOT_FOUND', 'Leave balance');

      const balanceAfter = Number(current.remainingDays) + dto.days;
      if (balanceAfter < 0) {
        throw new ConflictException({
          code: 'LEAVE_BALANCE_NEGATIVE',
          message: 'This adjustment would make the leave balance negative',
        });
      }
      const balance = await tx.leaveBalance.update({
        where: { id },
        data: { remainingDays: balanceAfter },
      });
      await tx.leaveBalanceLedger.create({
        data: {
          tenantId: this.tenantId(),
          balanceId: id,
          entryType:
            dto.days >= 0
              ? LeaveBalanceEntryType.CREDIT
              : LeaveBalanceEntryType.DEBIT,
          days: Math.abs(dto.days),
          balanceAfter,
          reason: dto.reason.trim(),
          actorUserId: this.userId(),
          idempotencyKey: `manual:${id}:${randomUUID()}`,
        },
      });
      await this.record(tx, 'balance.adjusted', id, {
        balanceId: id,
        days: dto.days,
        balanceAfter,
        reason: dto.reason.trim(),
      });
      return { data: balance };
    });
  }

  balances(query: LeaveBalanceQueryDto) {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.leaveBalance.findMany({
        where: { employeeId: query.employeeId, policyId: query.policyId },
        include: {
          employee: {
            select: { id: true, employeeCode: true, fullName: true },
          },
          policy: true,
        },
        orderBy: [
          { employee: { employeeCode: 'asc' } },
          { policy: { name: 'asc' } },
        ],
      }),
    }));
  }

  async createRequest(dto: CreateLeaveRequestDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.currentEmployee(tx);
      await this.lockEmployee(tx, employee.id);
      const range = parseRange(dto.startDate, dto.endDate);
      validateHalfDays(
        range.start,
        range.end,
        dto.halfDayStart,
        dto.halfDayEnd,
      );
      await this.assertUnlocked(tx, employee.id, range.start, range.end);
      await this.assertNoOverlap(tx, employee.id, range.start, range.end);
      const policy = await tx.leavePolicy.findFirst({
        where: { id: dto.policyId, isActive: true },
      });
      if (!policy) this.notFound('LEAVE_POLICY_NOT_FOUND', 'Leave policy');
      const totalDays = await this.workingDays(
        tx,
        employee.id,
        range.start,
        range.end,
        dto.halfDayStart,
        dto.halfDayEnd,
      );
      if (totalDays <= 0) {
        throw new UnprocessableEntityException({
          code: 'LEAVE_HAS_NO_WORKING_DAYS',
          message: 'The selected range contains no working days',
        });
      }
      const balance = await this.ensureBalance(tx, employee.id, policy.id);
      await this.lockBalance(tx, balance.id);
      const fresh = await tx.leaveBalance.findUniqueOrThrow({
        where: { id: balance.id },
      });
      if (Number(fresh.remainingDays) < totalDays) {
        throw new ConflictException({
          code: 'LEAVE_BALANCE_INSUFFICIENT',
          message: 'Available leave balance is insufficient',
        });
      }
      const request = await tx.leaveRequest.create({
        data: {
          tenantId,
          employeeId: employee.id,
          policyId: policy.id,
          startDate: range.start,
          endDate: range.end,
          halfDayStart: dto.halfDayStart,
          halfDayEnd: dto.halfDayEnd,
          totalDays,
          reason: dto.reason.trim(),
        },
        include: includeRequest,
      });
      const remaining = Number(fresh.remainingDays) - totalDays;
      await Promise.all([
        tx.leaveBalance.update({
          where: { id: fresh.id },
          data: { remainingDays: remaining },
        }),
        tx.leaveBalanceLedger.create({
          data: {
            tenantId,
            balanceId: fresh.id,
            leaveRequestId: request.id,
            entryType: LeaveBalanceEntryType.DEBIT,
            days: totalDays,
            balanceAfter: remaining,
            reason: 'Leave request balance reservation',
            actorUserId: this.userId(),
            idempotencyKey: `leave:${request.id}:reserve`,
          },
        }),
      ]);
      await this.record(tx, 'submitted', request.id, eventPayload(request));
      return { data: serialize(request) };
    });
  }

  listRequests(query: LeaveRequestQueryDto) {
    return this.prisma.forTenant(async (tx) => {
      const scope = await this.scope(tx);
      const where = {
        employeeId: query.employeeId
          ? scope.employeeIds.includes(query.employeeId)
            ? query.employeeId
            : '__forbidden__'
          : { in: scope.employeeIds },
        status: query.status,
      } as Prisma.LeaveRequestWhereInput;
      const [data, total] = await Promise.all([
        tx.leaveRequest.findMany({
          where,
          include: includeRequest,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.leaveRequest.count({ where }),
      ]);
      return {
        data: data.map(serialize),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  getRequest(id: string) {
    return this.prisma.forTenant(async (tx) => ({
      data: serialize(await this.findScoped(tx, id)),
    }));
  }

  approve(id: string, dto: LeaveDecisionDto) {
    return this.decide(id, RequestStatus.APPROVED, dto);
  }
  reject(id: string, dto: LeaveDecisionDto) {
    return this.decide(id, RequestStatus.REJECTED, dto);
  }

  cancel(id: string) {
    return this.prisma.forTenant(async (tx) => {
      await this.lockRequest(tx, id);
      const request = await tx.leaveRequest.findUnique({
        where: { id },
        include: includeRequest,
      });
      if (!request) this.notFound('LEAVE_REQUEST_NOT_FOUND', 'Leave request');
      const employee = await this.currentEmployee(tx);
      if (request.employeeId !== employee.id)
        throw new ForbiddenException({
          code: 'LEAVE_NOT_AUTHORIZED',
          message: 'Only the requester can cancel this leave',
        });
      this.assertPending(request.status);
      await this.assertUnlocked(
        tx,
        request.employeeId,
        request.startDate,
        request.endDate,
      );
      await this.restore(tx, request, 'cancel');
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status: RequestStatus.CANCELLED },
        include: includeRequest,
      });
      await this.record(tx, 'cancelled', id, eventPayload(updated));
      return { data: serialize(updated) };
    });
  }

  private decide(id: string, decision: RequestStatus, dto: LeaveDecisionDto) {
    return this.prisma.forTenant(async (tx) => {
      await this.lockRequest(tx, id);
      const request = await tx.leaveRequest.findUnique({
        where: { id },
        include: includeRequest,
      });
      if (!request) this.notFound('LEAVE_REQUEST_NOT_FOUND', 'Leave request');
      await this.assertCanApprove(tx, request.employeeId);
      if (request.status === decision)
        return { data: serialize(request), replayed: true };
      this.assertPending(request.status);
      await this.assertUnlocked(
        tx,
        request.employeeId,
        request.startDate,
        request.endDate,
      );
      if (decision === RequestStatus.REJECTED)
        await this.restore(tx, request, 'reject');
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: decision,
          approvedBy: this.userId(),
          approvedAt: new Date(),
          managerComments: dto.comment.trim(),
        },
        include: includeRequest,
      });
      await this.record(
        tx,
        decision === RequestStatus.APPROVED ? 'approved' : 'rejected',
        id,
        eventPayload(updated),
      );
      return {
        data: serialize(updated),
        replayed: false,
        coverageWarnings: await this.coverageWarnings(tx, updated),
      };
    });
  }

  private async restore(
    tx: PrismaTransaction,
    request: RequestWithRelations,
    action: string,
  ) {
    const balance = await tx.leaveBalance.findUnique({
      where: {
        tenantId_employeeId_policyId: {
          tenantId: this.tenantId(),
          employeeId: request.employeeId,
          policyId: request.policyId,
        },
      },
    });
    if (!balance) return;
    await this.lockBalance(tx, balance.id);
    const current = await tx.leaveBalance.findUniqueOrThrow({
      where: { id: balance.id },
    });
    const days = Number(request.totalDays);
    const remaining = Number(current.remainingDays) + days;
    await Promise.all([
      tx.leaveBalance.update({
        where: { id: current.id },
        data: { remainingDays: remaining },
      }),
      tx.leaveBalanceLedger.upsert({
        where: {
          tenantId_idempotencyKey: {
            tenantId: this.tenantId(),
            idempotencyKey: `leave:${request.id}:restore:${action}`,
          },
        },
        update: {},
        create: {
          tenantId: this.tenantId(),
          balanceId: current.id,
          leaveRequestId: request.id,
          entryType: LeaveBalanceEntryType.RESTORE,
          days,
          balanceAfter: remaining,
          reason: `Leave request ${action} restoration`,
          actorUserId: this.userId(),
          idempotencyKey: `leave:${request.id}:restore:${action}`,
        },
      }),
    ]);
  }

  private async workingDays(
    tx: PrismaTransaction,
    employeeId: string,
    start: Date,
    end: Date,
    halfStart: boolean,
    halfEnd: boolean,
  ) {
    const employee = await tx.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: { officeAssignments: { where: { isPrimary: true }, take: 1 } },
    });
    const [settings, assignment, holidays] = await Promise.all([
      tx.tenantSettings.findUniqueOrThrow({
        where: { tenantId: this.tenantId() },
      }),
      tx.policyAssignment.findFirst({
        where: {
          OR: [
            { scope: 'EMPLOYEE', employeeId },
            { scope: 'DEPARTMENT', deptId: employee.deptId },
            { scope: 'TENANT_DEFAULT' },
          ],
        },
        include: { policy: true },
        orderBy: { scope: 'asc' },
      }),
      tx.tenantHoliday.findMany({
        where: {
          holidayDate: { gte: start, lte: end },
          OR: [
            { officeLocationId: null },
            {
              officeLocationId: employee.officeAssignments[0]?.officeLocationId,
            },
          ],
        },
        select: { holidayDate: true },
      }),
    ]);
    const weeklyOffs = assignment?.policy.weeklyOffs ?? settings.weeklyOffs;
    const holidaySet = new Set(
      holidays.map((item) => isoDay(item.holidayDate)),
    );
    const working: string[] = [];
    for (let at = start.getTime(); at <= end.getTime(); at += 86_400_000) {
      const date = new Date(at);
      if (!holidaySet.has(isoDay(date)) && !isWeeklyOff(weeklyOffs, date))
        working.push(isoDay(date));
    }
    let total = working.length;
    if (halfStart && working.includes(isoDay(start))) total -= 0.5;
    if (halfEnd && working.includes(isoDay(end))) total -= 0.5;
    return total;
  }

  private async ensureBalance(
    tx: PrismaTransaction,
    employeeId: string,
    policyId: string,
  ) {
    const existing = await tx.leaveBalance.findUnique({
      where: {
        tenantId_employeeId_policyId: {
          tenantId: this.tenantId(),
          employeeId,
          policyId,
        },
      },
    });
    if (existing) return existing;
    await provisionEmployeeLeaveBalances(
      tx,
      this.tenantId(),
      employeeId,
      this.userId(),
    );
    const provisioned = await tx.leaveBalance.findUnique({
      where: {
        tenantId_employeeId_policyId: {
          tenantId: this.tenantId(),
          employeeId,
          policyId,
        },
      },
    });
    if (!provisioned) {
      throw new ConflictException({
        code: 'LEAVE_POLICY_INACTIVE',
        message: 'The selected leave policy is not available',
      });
    }
    return provisioned;
  }

  private async scope(tx: PrismaTransaction) {
    const actor = await tx.user.findUnique({
      where: { id: this.userId() },
      include: {
        employee: true,
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!actor)
      throw new ForbiddenException({
        code: 'LEAVE_NOT_AUTHORIZED',
        message: 'The authenticated user could not be resolved',
      });
    const permissions = new Set(
      actor.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.key),
      ),
    );
    if (permissions.has(MANAGE))
      return {
        employeeIds: (await tx.employee.findMany({ select: { id: true } })).map(
          ({ id }) => id,
        ),
        canManage: true,
        actorId: actor.employee?.id ?? null,
      };
    if (!actor.employee)
      throw new ForbiddenException({
        code: 'EMPLOYEE_PROFILE_REQUIRED',
        message: 'An employee profile is required',
      });
    if (permissions.has(APPROVE)) {
      const nodes = await tx.employee.findMany({
        select: { id: true, managerId: true },
      });
      return {
        employeeIds: [
          actor.employee.id,
          ...collectReports(actor.employee.id, nodes),
        ],
        canManage: false,
        actorId: actor.employee.id,
      };
    }
    return {
      employeeIds: [actor.employee.id],
      canManage: false,
      actorId: actor.employee.id,
    };
  }

  private async assertCanApprove(tx: PrismaTransaction, employeeId: string) {
    const scope = await this.scope(tx);
    if (
      employeeId === scope.actorId ||
      !scope.employeeIds.includes(employeeId)
    ) {
      throw new ForbiddenException({
        code: 'LEAVE_NOT_AUTHORIZED',
        message: 'This leave request is outside your approval scope',
      });
    }
  }

  private async findScoped(tx: PrismaTransaction, id: string) {
    const scope = await this.scope(tx);
    const request = await tx.leaveRequest.findFirst({
      where: { id, employeeId: { in: scope.employeeIds } },
      include: includeRequest,
    });
    if (!request) this.notFound('LEAVE_REQUEST_NOT_FOUND', 'Leave request');
    return request;
  }

  private currentEmployee(tx: PrismaTransaction) {
    return tx.employee
      .findFirst({ where: { userId: this.userId(), status: 'ACTIVE' } })
      .then((employee) => {
        if (!employee)
          throw new ForbiddenException({
            code: 'EMPLOYEE_PROFILE_REQUIRED',
            message: 'An active employee profile is required',
          });
        return employee;
      });
  }

  private async assertNoOverlap(
    tx: PrismaTransaction,
    employeeId: string,
    start: Date,
    end: Date,
  ) {
    const overlap = await tx.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap)
      throw new ConflictException({
        code: 'LEAVE_REQUEST_OVERLAP',
        message: 'A pending or approved leave overlaps this range',
      });
  }

  private async assertUnlocked(
    tx: PrismaTransaction,
    employeeId: string,
    start: Date,
    end: Date,
  ) {
    await assertAttendanceRangeUnlocked(tx, start, end, employeeId);
  }

  private lockEmployee(tx: PrismaTransaction, id: string) {
    return tx.$queryRaw`SELECT id FROM employees WHERE id = ${id}::uuid FOR UPDATE`;
  }
  private lockBalance(tx: PrismaTransaction, id: string) {
    return tx.$queryRaw`SELECT id FROM leave_balances WHERE id = ${id}::uuid FOR UPDATE`;
  }
  private lockRequest(tx: PrismaTransaction, id: string) {
    return tx.$queryRaw`SELECT id FROM leave_requests WHERE id = ${id}::uuid FOR UPDATE`;
  }

  private assertPending(status: RequestStatus) {
    if (status !== RequestStatus.PENDING)
      throw new ConflictException({
        code: 'LEAVE_ALREADY_DECIDED',
        message: 'This leave request already has a terminal decision',
      });
  }

  private async coverageWarnings(
    tx: PrismaTransaction,
    request: RequestWithRelations,
  ) {
    const peerCount = await tx.leaveRequest.count({
      where: {
        id: { not: request.id },
        employee: { deptId: request.employee.deptId },
        status: RequestStatus.APPROVED,
        startDate: { lte: request.endDate },
        endDate: { gte: request.startDate },
      },
    });
    return peerCount
      ? [
          `${peerCount} other department employee(s) have approved leave in this range`,
        ]
      : [];
  }

  private async record(
    tx: PrismaTransaction,
    action: string,
    id: string,
    payload: Record<string, unknown>,
  ) {
    await Promise.all([
      this.audit.append(tx, {
        tenantId: this.tenantId(),
        action: `leave.${action}`,
        module: 'leave',
        entityType: action.startsWith('policy.')
          ? 'LeavePolicy'
          : 'LeaveRequest',
        entityId: id,
        newValue: payload,
      }),
      this.outbox.append(tx, {
        tenantId: this.tenantId(),
        eventKey: `leave.${action.replace('policy.', 'policy_')}`,
        payload: { referenceId: id, ...payload },
      }),
    ]);
  }

  private tenantId() {
    if (!this.context.tenantId) throw new Error('Tenant context is required');
    return this.context.tenantId;
  }
  private userId() {
    if (!this.context.userId) throw new Error('User context is required');
    return this.context.userId;
  }
  private notFound(code: string, label: string): never {
    throw new NotFoundException({ code, message: `${label} was not found` });
  }
}

const includeRequest = {
  policy: true,
  employee: {
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      deptId: true,
      managerId: true,
    },
  },
} satisfies Prisma.LeaveRequestInclude;
type RequestWithRelations = Prisma.LeaveRequestGetPayload<{
  include: typeof includeRequest;
}>;

function policyLogic(dto: CreateLeavePolicyDto) {
  return {
    ...dto.accrualLogic,
    annualEntitlement: dto.annualEntitlement,
    carryForwardLimit: dto.carryForwardLimit,
  } as Prisma.InputJsonValue;
}
function parseRange(startText: string, endText: string) {
  const start = new Date(`${startText}T00:00:00.000Z`);
  const end = new Date(`${endText}T00:00:00.000Z`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end ||
    end.getTime() - start.getTime() > 366 * 86_400_000
  ) {
    throw new UnprocessableEntityException({
      code: 'LEAVE_DATE_RANGE_INVALID',
      message:
        'Leave range must be valid, ordered, and no longer than one year',
    });
  }
  return { start, end };
}
function validateHalfDays(
  start: Date,
  end: Date,
  halfStart: boolean,
  halfEnd: boolean,
) {
  if (start.getTime() === end.getTime() && halfStart && halfEnd) {
    throw new UnprocessableEntityException({
      code: 'LEAVE_HALF_DAY_INVALID',
      message: 'Choose only one half-day flag for a single-day leave',
    });
  }
}
function isWeeklyOff(value: Prisma.JsonValue, date: Date) {
  const rules = Array.isArray(value) ? value : [];
  const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][
    date.getUTCDay()
  ];
  const occurrence = Math.floor((date.getUTCDate() - 1) / 7) + 1;
  return rules.some((rule) => {
    if (rule === weekday) return true;
    const object = jsonObject(rule);
    return (
      object.weekday === weekday &&
      Array.isArray(object.occurrences) &&
      object.occurrences.map(Number).includes(occurrence)
    );
  });
}
function collectReports(
  managerId: string,
  nodes: Array<{ id: string; managerId: string | null }>,
) {
  const result: string[] = [];
  const queue = [managerId];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const node of nodes)
      if (node.managerId === parent && !result.includes(node.id)) {
        result.push(node.id);
        queue.push(node.id);
      }
  }
  return result;
}
function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function isoDay(value: Date) {
  return value.toISOString().slice(0, 10);
}
function eventPayload(request: RequestWithRelations) {
  return {
    leaveRequestId: request.id,
    employeeId: request.employeeId,
    policyId: request.policyId,
    startDate: isoDay(request.startDate),
    endDate: isoDay(request.endDate),
    halfDayStart: request.halfDayStart,
    halfDayEnd: request.halfDayEnd,
    totalDays: Number(request.totalDays),
    status: request.status,
  };
}
function serialize(request: RequestWithRelations) {
  return { ...request, totalDays: Number(request.totalDays) };
}

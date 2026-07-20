import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  EventType,
  Prisma,
  RequestStatus,
  type AttendanceEvent,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { AuditService } from '../../../platform/audit/public';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { PrivateObjectStorageService } from '../../../shared/storage/private-object-storage.service';
import { TenantContextService } from '../../../platform/tenancy/public';
import { calculateAttendance } from '../core/domain/attendance-calculator';
import { AttendanceJobProcessor } from '../core/jobs/attendance-job.processor';
import type {
  AttendancePolicySnapshot,
  AttendanceShiftSnapshot,
} from '../core/domain/attendance-types';
import { collectReportingEmployeeIds } from '../../../platform/organization/public';
import {
  CreateRegularizationDto,
  RegularizationAttachmentDto,
  RegularizationDecisionDto,
  RegularizationQueryDto,
} from './dto/regularization.dto';

const MANAGE_PERMISSION = 'attendance.regularizations.manage';
const APPROVE_PERMISSION = 'attendance.approvals.manage';

@Injectable()
export class RegularizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly storage: PrivateObjectStorageService,
    private readonly attendanceJobs: AttendanceJobProcessor,
  ) {}

  list(query: RegularizationQueryDto) {
    return this.prisma.forTenant(async (tx) => {
      const scope = await this.scope(tx);
      const employeeId = query.employeeId;
      if (employeeId && !scope.employeeIds.includes(employeeId))
        this.notFound();
      const where: Prisma.RegularizationRequestWhereInput = {
        employeeId: employeeId ?? { in: scope.employeeIds },
        status: query.status,
      };
      const [data, total] = await Promise.all([
        tx.regularizationRequest.findMany({
          where,
          include: {
            employee: {
              select: { id: true, employeeCode: true, fullName: true },
            },
            attendanceLog: {
              select: {
                attendanceDate: true,
                firstCheckin: true,
                lastCheckout: true,
                attendanceStatus: true,
                lockedAt: true,
              },
            },
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.regularizationRequest.count({ where }),
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

  get(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const value = await this.findScoped(tx, id);
      return { data: serialize(value) };
    });
  }

  create(dto: CreateRegularizationDto) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.currentEmployee(tx);
      return this.createRequest(tx, employee.id, dto);
    });
  }

  createForEmployee(employeeId: string, dto: CreateRegularizationDto) {
    return this.prisma.forTenant(async (tx) => {
      await this.assertCanApprove(tx, employeeId);
      const employee = await tx.employee.findFirst({
        where: { id: employeeId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!employee) this.notFound('Employee');
      let attendanceLogId = dto.attendanceLogId;
      if (!attendanceLogId) {
        if (!dto.attendanceDate) {
          throw new UnprocessableEntityException({
            code: 'ATTENDANCE_DAY_REQUIRED',
            message: 'Select an attendance day to correct',
          });
        }
        await this.attendanceJobs.recomputeEmployeeDay(
          this.tenantId(),
          employee.id,
          dto.attendanceDate,
        );
        attendanceLogId = (
          await tx.attendanceLog.findFirst({
            where: {
              employeeId: employee.id,
              attendanceDate: new Date(`${dto.attendanceDate}T00:00:00.000Z`),
            },
            select: { id: true },
          })
        )?.id;
      }
      if (!attendanceLogId) this.notFound('Attendance day');
      return this.createRequest(tx, employee.id, { ...dto, attendanceLogId });
    });
  }

  approve(id: string, dto: RegularizationDecisionDto) {
    return this.decide(id, RequestStatus.APPROVED, dto);
  }

  reject(id: string, dto: RegularizationDecisionDto) {
    return this.decide(id, RequestStatus.REJECTED, dto);
  }

  cancel(id: string) {
    return this.prisma.forTenant(async (tx) => {
      await this.lockRequest(tx, id);
      const value = await tx.regularizationRequest.findUnique({
        where: { id },
        include: includeRequest,
      });
      if (!value) this.notFound();
      const employee = await this.currentEmployee(tx);
      if (value.employeeId !== employee.id) this.notFound();
      if (value.status === RequestStatus.CANCELLED) {
        return { data: serialize(value), replayed: true };
      }
      this.assertPending(value.status);
      this.assertUnlocked(value.attendanceLog);
      const updated = await tx.regularizationRequest.update({
        where: { id },
        data: { status: RequestStatus.CANCELLED, cancelledAt: new Date() },
        include: includeRequest,
      });
      await this.record(tx, 'cancelled', updated);
      return { data: serialize(updated), replayed: false };
    });
  }

  presignAttachment(dto: RegularizationAttachmentDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.currentEmployee(tx);
      return this.storage.presignRegularizationAttachment(
        tenantId,
        employee.id,
        dto.filename,
        dto.contentType,
        dto.fileSize,
      );
    });
  }

  private decide(
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    dto: RegularizationDecisionDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      await this.lockRequest(tx, id);
      const value = await tx.regularizationRequest.findUnique({
        where: { id },
        include: includeRequest,
      });
      if (!value) this.notFound();
      await this.assertCanApprove(tx, value.employeeId);
      if (value.status === decision) {
        return { data: serialize(value), replayed: true };
      }
      this.assertPending(value.status);
      this.assertUnlocked(value.attendanceLog);
      if (decision === RequestStatus.APPROVED) {
        await this.applySyntheticEvents(tx, value);
      }
      const now = new Date();
      const updated = await tx.regularizationRequest.update({
        where: { id },
        data: {
          status: decision,
          managerComments: dto.comment.trim(),
          approvedBy: this.userId(),
          approvedAt: now,
        },
        include: includeRequest,
      });
      await this.record(tx, decision.toLowerCase(), updated);
      return { data: serialize(updated), replayed: false };
    });
  }

  private async applySyntheticEvents(
    tx: PrismaTransaction,
    request: RequestWithRelations,
  ) {
    const log = await tx.attendanceLog.findUniqueOrThrow({
      where: { id: request.attendanceLogId },
      include: {
        payrollLock: true,
        appliedShift: true,
        events: { orderBy: [{ eventTime: 'asc' }, { syncTime: 'asc' }] },
      },
    });
    this.assertUnlocked(log);
    const events: AttendanceEvent[] = [...log.events];
    for (const candidate of [
      request.requestedCheckin
        ? {
            eventType: EventType.REGULARIZED_CHECKIN,
            at: request.requestedCheckin,
          }
        : null,
      request.requestedCheckout
        ? {
            eventType: EventType.REGULARIZED_CHECKOUT,
            at: request.requestedCheckout,
          }
        : null,
    ]) {
      if (!candidate) continue;
      const event = await tx.attendanceEvent.create({
        data: {
          tenantId: this.tenantId(),
          attendanceLogId: log.id,
          employeeId: request.employeeId,
          eventType: candidate.eventType,
          source: 'REGULARIZED',
          eventTime: candidate.at,
          createdBy: this.userId(),
          regularizationRequestId: request.id,
        },
      });
      events.push(event);
    }
    const settings = await tx.tenantSettings.findUniqueOrThrow({
      where: { tenantId: this.tenantId() },
    });
    const policy = policySnapshot(log.appliedPolicySnapshot);
    const shift = log.appliedShift
      ? shiftSnapshot(log.appliedShift, settings.timezone)
      : settingsShift(settings);
    const calculation = calculateAttendance({
      attendanceDate: isoDate(log.attendanceDate),
      timezone: shift.timezone,
      policy,
      shift,
      events: events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        eventTime: event.eventTime,
        createdAt: event.syncTime,
      })),
      finalizing: true,
      evaluationTime: new Date(),
    });
    await tx.attendanceLog.update({
      where: { id: log.id },
      data: {
        firstCheckin: calculation.firstCheckin,
        lastCheckout: calculation.lastCheckout,
        totalWorkMinutes: calculation.totalWorkMinutes,
        lateMinutes: calculation.lateMinutes,
        overtimeMinutes: calculation.overtimeMinutes,
        earlyLeaveMinutes: calculation.earlyLeaveMinutes,
        breakMinutes: calculation.breakMinutes,
        attendanceStatus: calculation.attendanceStatus,
        finalizedAt: new Date(),
      },
    });
  }

  private async createRequest(
    tx: PrismaTransaction,
    employeeId: string,
    dto: CreateRegularizationDto,
  ) {
    if (!dto.attendanceLogId) this.notFound('Attendance day');
    const tenantId = this.tenantId();
    const replay = await tx.regularizationRequest.findFirst({
      where: { employeeId, idempotencyKey: dto.idempotencyKey },
      include: includeRequest,
    });
    if (replay) return { data: serialize(replay), replayed: true };
    const log = await tx.attendanceLog.findFirst({
      where: { id: dto.attendanceLogId, employeeId },
      include: { payrollLock: true },
    });
    if (!log) this.notFound('Attendance day');
    await this.lockRequestDay(tx, employeeId, log.id);
    this.assertUnlocked(log);
    await this.assertWindow(tx, log.attendanceDate);
    const requestedCheckin = optionalDate(dto.requestedCheckin);
    const requestedCheckout = optionalDate(dto.requestedCheckout);
    this.assertRequestedTimes(log, requestedCheckin, requestedCheckout);
    if (dto.attachmentKey) {
      await this.storage.verifyRegularizationAttachment(
        tenantId,
        employeeId,
        dto.attachmentKey,
      );
    }
    const existing = await tx.regularizationRequest.findFirst({
      where: { employeeId, attendanceLogId: log.id },
      include: includeRequest,
    });
    if (existing) {
      throw new ConflictException({
        code: 'REGULARIZATION_ALREADY_EXISTS',
        message: 'A correction request already exists for this attendance day',
      });
    }
    const value = await tx.regularizationRequest.create({
      data: {
        tenantId,
        attendanceLogId: log.id,
        employeeId,
        requestedCheckin,
        requestedCheckout,
        reason: dto.reason.trim(),
        attachmentKey: dto.attachmentKey,
        idempotencyKey: dto.idempotencyKey,
      },
      include: includeRequest,
    });
    await this.record(tx, 'submitted', value, {
      attendanceDate: isoDate(log.attendanceDate),
      submittedBy: this.userId(),
    });
    return { data: serialize(value), replayed: false };
  }

  private async assertWindow(tx: PrismaTransaction, attendanceDate: Date) {
    const settings = await tx.tenantSettings.findUniqueOrThrow({
      where: { tenantId: this.tenantId() },
    });
    const today = DateTime.now().setZone(settings.timezone).startOf('day');
    const requested = DateTime.fromJSDate(attendanceDate, { zone: 'utc' });
    const age = Math.floor(today.diff(requested, 'days').days);
    if (age < 0 || age > settings.regularizationWindowDays) {
      throw new UnprocessableEntityException({
        code: 'REGULARIZATION_WINDOW_EXPIRED',
        message: 'This attendance day is outside the correction request window',
      });
    }
  }

  private assertRequestedTimes(
    log: { firstCheckin: Date | null; lastCheckout: Date | null },
    requestedCheckin: Date | null,
    requestedCheckout: Date | null,
  ) {
    if (!requestedCheckin && !requestedCheckout) {
      throw new UnprocessableEntityException({
        code: 'REGULARIZATION_CHANGE_REQUIRED',
        message: 'At least one corrected attendance time is required',
      });
    }
    const checkin = requestedCheckin ?? log.firstCheckin;
    const checkout = requestedCheckout ?? log.lastCheckout;
    if (checkin && checkout && checkin >= checkout) {
      throw new UnprocessableEntityException({
        code: 'REGULARIZATION_TIME_INVALID',
        message: 'Corrected checkout must be after corrected check-in',
      });
    }
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
    if (!actor) {
      throw new ForbiddenException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'The authenticated user could not be found',
      });
    }
    const permissions = new Set(
      actor.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.key),
      ),
    );
    if (permissions.has(MANAGE_PERMISSION)) {
      return {
        employeeIds: (await tx.employee.findMany({ select: { id: true } })).map(
          ({ id }) => id,
        ),
        canManage: true,
      };
    }
    if (!actor.employee) {
      throw new ForbiddenException({
        code: 'EMPLOYEE_PROFILE_REQUIRED',
        message: 'An employee profile is required',
      });
    }
    if (permissions.has(APPROVE_PERMISSION)) {
      const nodes = await tx.employee.findMany({
        select: { id: true, managerId: true },
      });
      return {
        employeeIds: [
          actor.employee.id,
          ...collectReportingEmployeeIds(actor.employee.id, nodes),
        ],
        canManage: false,
      };
    }
    return { employeeIds: [actor.employee.id], canManage: false };
  }

  private async assertCanApprove(tx: PrismaTransaction, employeeId: string) {
    const scope = await this.scope(tx);
    if (
      !scope.employeeIds.includes(employeeId) ||
      (!scope.canManage && scope.employeeIds[0] === employeeId)
    ) {
      throw new ForbiddenException({
        code: 'REGULARIZATION_NOT_AUTHORIZED',
        message: 'This request is outside your approval scope',
      });
    }
  }

  private async findScoped(tx: PrismaTransaction, id: string) {
    const scope = await this.scope(tx);
    const value = await tx.regularizationRequest.findFirst({
      where: { id, employeeId: { in: scope.employeeIds } },
      include: includeRequest,
    });
    if (!value) this.notFound();
    return value;
  }

  private currentEmployee(tx: PrismaTransaction) {
    return tx.employee
      .findFirst({ where: { userId: this.userId(), status: 'ACTIVE' } })
      .then((employee) => {
        if (!employee) {
          throw new ForbiddenException({
            code: 'EMPLOYEE_PROFILE_REQUIRED',
            message: 'An active employee profile is required',
          });
        }
        return employee;
      });
  }

  private async lockRequestDay(
    tx: PrismaTransaction,
    employeeId: string,
    attendanceLogId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM attendance_logs WHERE id = ${attendanceLogId}::uuid AND "employeeId" = ${employeeId}::uuid FOR UPDATE`;
  }

  private async lockRequest(tx: PrismaTransaction, id: string) {
    await tx.$queryRaw`SELECT id FROM regularization_requests WHERE id = ${id}::uuid FOR UPDATE`;
  }

  private assertPending(status: RequestStatus) {
    if (status !== RequestStatus.PENDING) {
      throw new ConflictException({
        code: 'REGULARIZATION_ALREADY_DECIDED',
        message: 'This correction request already has a terminal decision',
      });
    }
  }

  private assertUnlocked(log: {
    lockedAt: Date | null;
    payrollLock?: { status: string } | null;
  }) {
    if (log.lockedAt || log.payrollLock?.status === 'LOCKED') {
      throw new HttpException(
        {
          code: 'ATTENDANCE_DAY_LOCKED',
          message: 'Attendance is locked for payroll',
        },
        423,
      );
    }
  }

  private async record(
    tx: PrismaTransaction,
    action: string,
    request: RequestWithRelations,
    extra?: Record<string, unknown>,
  ) {
    const payload = {
      regularizationRequestId: request.id,
      employeeId: request.employeeId,
      attendanceLogId: request.attendanceLogId,
      status: request.status,
      ...extra,
    };
    await Promise.all([
      this.audit.append(tx, {
        tenantId: this.tenantId(),
        action: `regularization.${action}`,
        module: 'regularization',
        entityType: 'RegularizationRequest',
        entityId: request.id,
        newValue: payload,
      }),
      this.outbox.append(tx, {
        tenantId: this.tenantId(),
        eventKey: `regularization.${action}`,
        payload,
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

  private notFound(entity = 'Regularization request'): never {
    throw new NotFoundException({
      code: 'REGULARIZATION_NOT_FOUND',
      message: `${entity} was not found`,
    });
  }
}

const includeRequest = {
  employee: { select: { id: true, employeeCode: true, fullName: true } },
  attendanceLog: {
    include: { payrollLock: true },
  },
} satisfies Prisma.RegularizationRequestInclude;

type RequestWithRelations = Prisma.RegularizationRequestGetPayload<{
  include: typeof includeRequest;
}>;

function serialize(value: RequestWithRelations) {
  return {
    ...value,
    attendanceLog: {
      ...value.attendanceLog,
      attendanceDate: isoDate(value.attendanceLog.attendanceDate),
    },
  };
}

function optionalDate(value?: string) {
  return value ? new Date(value) : null;
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function policySnapshot(value: Prisma.JsonValue): AttendancePolicySnapshot {
  const policy =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const number = (key: string, fallback: number) =>
    typeof policy[key] === 'number' ? policy[key] : fallback;
  return {
    name: typeof policy.name === 'string' ? policy.name : 'Applied policy',
    lateAfterMinutes: number('lateAfterMinutes', 15),
    halfDayAfterMinutes: number('halfDayAfterMinutes', 240),
    minimumWorkMinutes: number('minimumWorkMinutes', 480),
    overtimeAfterMinutes: number('overtimeAfterMinutes', 540),
    breakRules: { paid: false },
  };
}

function shiftSnapshot(
  shift: { id: string; name: string; startTime: Date; endTime: Date },
  timezone: string,
): AttendanceShiftSnapshot {
  return {
    id: shift.id,
    name: shift.name,
    startTime: clock(shift.startTime),
    endTime: clock(shift.endTime),
    timezone,
  };
}

function settingsShift(settings: {
  workingDayStart: string;
  workingDayEnd: string;
  timezone: string;
}): AttendanceShiftSnapshot {
  return {
    name: 'Workspace default',
    startTime: settings.workingDayStart,
    endTime: settings.workingDayEnd,
    timezone: settings.timezone,
  };
}

function clock(value: Date) {
  return value.toISOString().slice(11, 16);
}

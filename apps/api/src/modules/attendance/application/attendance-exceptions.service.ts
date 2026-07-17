import {
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { TenantContextService } from '../../../shared/tenancy/tenant-context.service';
import { DateOnly } from '../domain/value-objects/date-only';
import {
  AttendanceExceptionQueryDto,
  CreateAttendanceExceptionDto,
  UpdateAttendanceExceptionDto,
} from '../presentation/dto/attendance-query.dto';

@Injectable()
export class AttendanceExceptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  list(query: AttendanceExceptionQueryDto) {
    return this.prisma.forTenant(async (tx) => {
      const where: Prisma.AttendanceExceptionWhereInput = {
        employeeId: query.employeeId,
        exceptionType: query.exceptionType,
        ...(query.startDate || query.endDate
          ? {
              startDate: query.endDate
                ? { lte: parseDate(query.endDate) }
                : undefined,
              endDate: query.startDate
                ? { gte: parseDate(query.startDate) }
                : undefined,
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        tx.attendanceException.findMany({
          where,
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.attendanceException.count({ where }),
      ]);
      const employees = await tx.employee.findMany({
        where: {
          id: { in: [...new Set(data.map(({ employeeId }) => employeeId))] },
        },
        select: { id: true, employeeCode: true, fullName: true },
      });
      const employeeById = new Map(
        employees.map((employee) => [employee.id, employee]),
      );
      return {
        data: data.map((item) => ({
          ...serialize(item),
          employee: employeeById.get(item.employeeId) ?? null,
        })),
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
      const value = await tx.attendanceException.findUnique({ where: { id } });
      if (!value) this.notFound();
      const employee = await tx.employee.findUnique({
        where: { id: value.employeeId },
        select: { id: true, employeeCode: true, fullName: true },
      });
      return { data: { ...serialize(value), employee } };
    });
  }

  create(dto: CreateAttendanceExceptionDto) {
    const tenantId = this.tenantId();
    const actorUserId = this.userId();
    const range = parseRange(dto.startDate, dto.endDate);
    return this.prisma.forTenant(async (tx) => {
      await this.lockEmployees(tx, [dto.employeeId]);
      await this.assertMutableRange(tx, dto.employeeId, range.start, range.end);
      await this.assertNoOverlap(tx, dto.employeeId, range.start, range.end);
      const value = await tx.attendanceException.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          exceptionType: dto.exceptionType,
          startDate: range.start,
          endDate: range.end,
          reason: dto.reason.trim(),
          approvedBy: actorUserId,
        },
      });
      await this.record(tx, 'created', value.id, undefined, value);
      return { data: serialize(value) };
    });
  }

  update(id: string, dto: UpdateAttendanceExceptionDto) {
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.attendanceException.findUnique({
        where: { id },
      });
      if (!current) this.notFound();
      const employeeId = dto.employeeId ?? current.employeeId;
      const startText = dto.startDate ?? isoDate(current.startDate);
      const endText = dto.endDate ?? isoDate(current.endDate);
      const range = parseRange(startText, endText);
      await this.lockEmployees(tx, [current.employeeId, employeeId]);
      await this.assertMutableRange(
        tx,
        current.employeeId,
        current.startDate,
        current.endDate,
      );
      await this.assertMutableRange(tx, employeeId, range.start, range.end);
      await this.assertNoOverlap(tx, employeeId, range.start, range.end, id);
      const value = await tx.attendanceException.update({
        where: { id },
        data: {
          employeeId,
          exceptionType: dto.exceptionType,
          startDate: range.start,
          endDate: range.end,
          reason: dto.reason?.trim(),
          approvedBy: this.userId(),
        },
      });
      await this.record(tx, 'updated', id, current, value);
      return { data: serialize(value) };
    });
  }

  remove(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.attendanceException.findUnique({
        where: { id },
      });
      if (!current) this.notFound();
      await this.lockEmployees(tx, [current.employeeId]);
      await this.assertMutableRange(
        tx,
        current.employeeId,
        current.startDate,
        current.endDate,
      );
      await tx.attendanceException.delete({ where: { id } });
      await this.record(tx, 'deleted', id, current, undefined);
      return { success: true };
    });
  }

  private async lockEmployees(tx: PrismaTransaction, employeeIds: string[]) {
    for (const employeeId of [...new Set(employeeIds)].sort()) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM employees
        WHERE id = ${employeeId}::uuid AND status = 'ACTIVE'
        FOR UPDATE
      `;
      if (!rows.length) this.notFound('Employee');
    }
  }

  private async assertNoOverlap(
    tx: PrismaTransaction,
    employeeId: string,
    startDate: Date,
    endDate: Date,
    ignoreId?: string,
  ) {
    const overlap = await tx.attendanceException.findFirst({
      where: {
        employeeId,
        id: ignoreId ? { not: ignoreId } : undefined,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlap) {
      throw new ConflictException({
        code: 'EXCEPTION_OVERLAP',
        message: 'Employee already has an exception in this date range',
      });
    }
  }

  private async assertMutableRange(
    tx: PrismaTransaction,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const locked = await tx.attendanceLog.findFirst({
      where: {
        employeeId,
        attendanceDate: { gte: startDate, lte: endDate },
        OR: [
          { lockedAt: { not: null } },
          { payrollLock: { status: 'LOCKED' } },
        ],
      },
    });
    if (locked) {
      throw new HttpException(
        {
          code: 'ATTENDANCE_DAY_LOCKED',
          message: 'Exception overlaps payroll-locked attendance',
        },
        423,
      );
    }
  }

  private async record(
    tx: PrismaTransaction,
    action: string,
    id: string,
    oldValue: unknown,
    newValue: unknown,
  ) {
    const tenantId = this.tenantId();
    await Promise.all([
      this.audit.append(tx, {
        tenantId,
        action: `attendance.exception.${action}`,
        module: 'attendance',
        entityType: 'AttendanceException',
        entityId: id,
        oldValue,
        newValue,
      }),
      this.outbox.append(tx, {
        tenantId,
        eventKey: `attendance.exception.${action}`,
        payload: { attendanceExceptionId: id },
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

  private notFound(entity = 'Attendance exception'): never {
    throw new NotFoundException({
      code: 'ATTENDANCE_NOT_FOUND',
      message: `${entity} was not found`,
    });
  }
}

function parseRange(startText: string, endText: string) {
  const start = parseDate(startText);
  const end = parseDate(endText);
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days < 1 || days > 366) {
    throw new UnprocessableEntityException({
      code: 'EXCEPTION_RANGE_INVALID',
      message: 'Exception range must contain 1 to 366 days',
    });
  }
  return { start, end };
}

function parseDate(value: string) {
  try {
    return DateOnly.parse(value).toDatabaseDate();
  } catch {
    throw new UnprocessableEntityException({
      code: 'EXCEPTION_RANGE_INVALID',
      message: 'Exception dates must be valid ISO dates',
    });
  }
}

function serialize<T extends { startDate: Date; endDate: Date }>(value: T) {
  return {
    ...value,
    startDate: isoDate(value.startDate),
    endDate: isoDate(value.endDate),
  };
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

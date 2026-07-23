import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../../platform/audit/public';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { TenantContextService } from '../../../platform/tenancy/public';
import {
  AssignOfficeEmployeesDto,
  BulkRosterDto,
  CreateHolidayDto,
  CreateOfficeDto,
  CreatePolicyDto,
  CreateRosterDto,
  CreateShiftDto,
  ReplacePolicyAssignmentsDto,
  RosterQueryDto,
  UpdateHolidayDto,
  UpdateOfficeDto,
  UpdatePolicyDto,
  UpdateShiftDto,
} from './dto/attendance-config.dto';
import {
  assertCoordinates,
  assertPolicyRules,
  isOvernightShift,
  normalizeNetworkEntries,
  resolvePolicy,
  resolveShift,
} from './attendance-config.rules';
import {
  assertTimezone,
  normalizeWeeklyOffs,
} from '../../../platform/workspace/public';
import { PolicyResolverCache } from './policy-resolver-cache.service';
import { canEnforceBiometrics } from '../../../shared/config/production-runtime-config';
import { bumpRuntimeConfigVersion } from '../../../shared/runtime-config/runtime-config-version';

@Injectable()
export class AttendanceConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly policyCache: PolicyResolverCache,
  ) {}

  listOffices() {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.officeLocation.findMany({
        include: { _count: { select: { assignments: true, holidays: true } } },
        orderBy: { officeName: 'asc' },
      }),
    }));
  }

  getOffice(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const office = await tx.officeLocation.findUnique({
        where: { id },
        include: {
          assignments: {
            include: {
              employee: {
                select: { id: true, employeeCode: true, fullName: true },
              },
            },
          },
          holidays: { orderBy: { holidayDate: 'asc' } },
        },
      });
      if (!office) this.notFound('Office');
      return { data: office };
    });
  }

  createOffice(dto: CreateOfficeDto) {
    const tenantId = this.tenantId();
    const data = this.officeData(dto);
    return this.prisma.forTenant(async (tx) => {
      await this.ensureOfficeName(tx, data.officeName);
      const office = await this.uniqueConflict(
        tx.officeLocation.create({ data: { tenantId, ...data } }),
        'OFFICE_NAME_EXISTS',
        'An office with this name already exists',
      );
      await this.record(
        tx,
        'attendance.office.created',
        'OfficeLocation',
        office.id,
        undefined,
        office,
      );
      await bumpRuntimeConfigVersion(tx, tenantId);
      return { data: office };
    });
  }

  updateOffice(id: string, dto: UpdateOfficeDto) {
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.officeLocation.findUnique({ where: { id } });
      if (!current) this.notFound('Office');
      const merged = this.officeData({
        officeName: dto.officeName ?? current.officeName,
        latitude: dto.latitude ?? Number(current.latitude),
        longitude: dto.longitude ?? Number(current.longitude),
        radiusMeters: dto.radiusMeters ?? current.radiusMeters,
        timezone:
          dto.timezone === undefined
            ? (current.timezone ?? undefined)
            : dto.timezone,
        egressIps: dto.egressIps ?? (current.egressIps as string[]),
        wifiSsids: dto.wifiSsids ?? (current.wifiSsids as string[]),
      });
      await this.ensureOfficeName(tx, merged.officeName, id);
      const office = await this.uniqueConflict(
        tx.officeLocation.update({ where: { id }, data: merged }),
        'OFFICE_NAME_EXISTS',
        'An office with this name already exists',
      );
      await this.record(
        tx,
        'attendance.office.updated',
        'OfficeLocation',
        id,
        current,
        office,
      );
      await bumpRuntimeConfigVersion(tx, this.tenantId());
      return { data: office };
    });
  }

  removeOffice(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const office = await tx.officeLocation.findUnique({
        where: { id },
        include: { _count: { select: { assignments: true, holidays: true } } },
      });
      if (!office) this.notFound('Office');
      const attendanceEvidence = await tx.attendanceVerificationLog.count({
        where: { matchedOfficeId: id },
      });
      if (
        office._count.assignments ||
        office._count.holidays ||
        attendanceEvidence
      ) {
        throw new ConflictException({
          code: 'OFFICE_IN_USE',
          message:
            'Office cannot be deleted while assignments or holidays reference it',
        });
      }
      await tx.officeLocation.delete({ where: { id } });
      await this.record(
        tx,
        'attendance.office.deleted',
        'OfficeLocation',
        id,
        office,
        undefined,
      );
      await bumpRuntimeConfigVersion(tx, this.tenantId());
      return { success: true };
    });
  }

  listOfficeEmployees(id: string) {
    return this.prisma.forTenant(async (tx) => {
      await this.requireOffice(tx, id);
      return {
        data: await tx.employeeOfficeAssignment.findMany({
          where: { officeLocationId: id },
          include: { employee: true },
          orderBy: { employee: { fullName: 'asc' } },
        }),
      };
    });
  }

  replaceOfficeEmployees(id: string, dto: AssignOfficeEmployeesDto) {
    const tenantId = this.tenantId();
    const primary = new Set(dto.primaryEmployeeIds ?? []);
    if (
      [...primary].some((employeeId) => !dto.employeeIds.includes(employeeId))
    ) {
      throw new BadRequestException({
        code: 'OFFICE_ASSIGNMENT_INVALID',
        message: 'Primary employees must be included in employeeIds',
      });
    }
    return this.prisma.forTenant(async (tx) => {
      await this.requireOffice(tx, id);
      const employees = await tx.employee.findMany({
        where: { id: { in: dto.employeeIds }, status: 'ACTIVE' },
        select: { id: true },
      });
      if (employees.length !== dto.employeeIds.length)
        this.notFound('Employee');
      const oldValue = await tx.employeeOfficeAssignment.findMany({
        where: { officeLocationId: id },
      });
      await tx.employeeOfficeAssignment.deleteMany({
        where: { officeLocationId: id },
      });
      if (dto.employeeIds.length) {
        await tx.employeeOfficeAssignment.createMany({
          data: dto.employeeIds.map((employeeId) => ({
            tenantId,
            employeeId,
            officeLocationId: id,
            isPrimary: primary.has(employeeId),
          })),
        });
      }
      const assignments = await tx.employeeOfficeAssignment.findMany({
        where: { officeLocationId: id },
      });
      await this.record(
        tx,
        'attendance.office.assignments.replaced',
        'OfficeLocation',
        id,
        oldValue,
        assignments,
      );
      await bumpRuntimeConfigVersion(tx, tenantId);
      return { data: assignments };
    });
  }


  listShifts() {
    return this.prisma.forTenant(async (tx) => ({
      data: (await tx.shift.findMany({ orderBy: { name: 'asc' } })).map(
        serializeShift,
      ),
    }));
  }

  getShift(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const shift = await tx.shift.findUnique({ where: { id } });
      if (!shift) this.notFound('Shift');
      return { data: serializeShift(shift) };
    });
  }

  createShift(dto: CreateShiftDto) {
    const tenantId = this.tenantId();
    const isOvernight = isOvernightShift(dto.startTime, dto.endTime);
    return this.prisma.forTenant(async (tx) => {
      await this.ensureShiftName(tx, dto.name);
      const shift = await this.uniqueConflict(
        tx.shift.create({
          data: {
            tenantId,
            name: normalizeName(dto.name),
            startTime: timeDate(dto.startTime),
            endTime: timeDate(dto.endTime),
            isOvernight,
          },
        }),
        'SHIFT_NAME_EXISTS',
        'A shift with this name already exists',
      );
      await this.record(
        tx,
        'attendance.shift.created',
        'Shift',
        shift.id,
        undefined,
        shift,
      );
      return { data: serializeShift(shift) };
    });
  }

  updateShift(id: string, dto: UpdateShiftDto) {
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.shift.findUnique({ where: { id } });
      if (!current) this.notFound('Shift');
      const startTime = dto.startTime ?? clock(current.startTime);
      const endTime = dto.endTime ?? clock(current.endTime);
      const name = normalizeName(dto.name ?? current.name);
      await this.ensureShiftName(tx, name, id);
      const shift = await this.uniqueConflict(
        tx.shift.update({
          where: { id },
          data: {
            name,
            startTime: timeDate(startTime),
            endTime: timeDate(endTime),
            isOvernight: isOvernightShift(startTime, endTime),
          },
        }),
        'SHIFT_NAME_EXISTS',
        'A shift with this name already exists',
      );
      await this.record(
        tx,
        'attendance.shift.updated',
        'Shift',
        id,
        current,
        shift,
      );
      return { data: serializeShift(shift) };
    });
  }

  removeShift(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const shift = await tx.shift.findUnique({
        where: { id },
        include: {
          _count: {
            select: { rosters: true, defaultFor: true, appliedLogs: true },
          },
        },
      });
      if (!shift) this.notFound('Shift');
      if (
        shift._count.rosters ||
        shift._count.defaultFor ||
        shift._count.appliedLogs
      )
        throw new ConflictException({
          code: 'SHIFT_IN_USE',
          message:
            'Shift cannot be deleted while employees or rosters reference it',
        });
      await tx.shift.delete({ where: { id } });
      await this.record(
        tx,
        'attendance.shift.deleted',
        'Shift',
        id,
        shift,
        undefined,
      );
      return { success: true };
    });
  }

  private officeData(dto: CreateOfficeDto) {
    assertCoordinates(dto.latitude, dto.longitude, dto.radiusMeters);
    if (dto.timezone) assertTimezone(dto.timezone);
    return {
      officeName: normalizeName(dto.officeName),
      latitude: new Prisma.Decimal(dto.latitude),
      longitude: new Prisma.Decimal(dto.longitude),
      radiusMeters: dto.radiusMeters,
      timezone: dto.timezone ?? null,
      egressIps: normalizeNetworkEntries(
        dto.egressIps,
      ) as Prisma.InputJsonValue,
      wifiSsids: [
        ...new Set(
          (dto.wifiSsids ?? []).map((ssid) => ssid.trim()).filter(Boolean),
        ),
      ] as Prisma.InputJsonValue,
    };
  }


  private async record(
    tx: PrismaTransaction,
    action: string,
    entityType: string,
    entityId?: string,
    oldValue?: unknown,
    newValue?: unknown,
  ) {
    const tenantId = this.tenantId();
    await this.audit.append(tx, {
      tenantId,
      action,
      module: 'ATTENDANCE',
      entityType,
      entityId,
      oldValue,
      newValue,
    });
    await this.outbox.append(tx, {
      tenantId,
      eventKey: action,
      payload: { tenantId, entityType, entityId: entityId ?? null },
    });
  }

  private async ensureOfficeName(
    tx: PrismaTransaction,
    name: string,
    excludeId?: string,
  ) {
    if (
      await tx.officeLocation.findFirst({
        where: {
          id: excludeId ? { not: excludeId } : undefined,
          officeName: { equals: name, mode: 'insensitive' },
        },
      })
    )
      throw new ConflictException({
        code: 'OFFICE_NAME_EXISTS',
        message: 'An office with this name already exists',
      });
  }
  private async ensureShiftName(
    tx: PrismaTransaction,
    name: string,
    excludeId?: string,
  ) {
    if (
      await tx.shift.findFirst({
        where: {
          id: excludeId ? { not: excludeId } : undefined,
          name: { equals: normalizeName(name), mode: 'insensitive' },
        },
      })
    )
      throw new ConflictException({
        code: 'SHIFT_NAME_EXISTS',
        message: 'A shift with this name already exists',
      });
  }
  private async requireOffice(tx: PrismaTransaction, id: string) {
    if (!(await tx.officeLocation.findUnique({ where: { id } })))
      this.notFound('Office');
  }
  private isUniqueError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
  private async uniqueConflict<T>(
    operation: Promise<T>,
    code: string,
    message: string,
  ) {
    try {
      return await operation;
    } catch (error) {
      if (this.isUniqueError(error))
        throw new ConflictException({ code, message });
      throw error;
    }
  }
  private notFound(resource: string): never {
    throw new NotFoundException({
      code: 'CONFIGURATION_NOT_FOUND',
      message: `${resource} not found`,
    });
  }
  private tenantId() {
    const tenantId = this.context.tenantId;
    if (!tenantId)
      throw new BadRequestException({
        code: 'WORKSPACE_HEADER_REQUIRED',
        message: 'Workspace header required',
      });
    return tenantId;
  }
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}
function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function timeDate(value: string) {
  return new Date(`1970-01-01T${value}:00.000Z`);
}
function clock(value: Date) {
  return value.toISOString().slice(11, 16);
}
function serializeShift<T extends { startTime: Date; endTime: Date }>(
  shift: T,
) {
  return {
    ...shift,
    startTime: clock(shift.startTime),
    endTime: clock(shift.endTime),
  };
}

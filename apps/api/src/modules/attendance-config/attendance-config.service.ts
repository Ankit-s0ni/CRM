import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
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
} from '../workspace-settings/workspace-settings.rules';
import { PolicyResolverCache } from './policy-resolver-cache.service';
import { canEnforceBiometrics } from '../../shared/config/production-runtime-config';
import { bumpRuntimeConfigVersion } from '../runtime-config/runtime-config-version';

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

  listPolicies() {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.attendancePolicy.findMany({
        include: { assignments: true },
        orderBy: { name: 'asc' },
      }),
    }));
  }

  getPolicy(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const policy = await tx.attendancePolicy.findUnique({
        where: { id },
        include: { assignments: true },
      });
      if (!policy) this.notFound('Policy');
      return { data: policy };
    });
  }

  async createPolicy(dto: CreatePolicyDto) {
    const tenantId = this.tenantId();
    const data = this.policyData(dto);
    const result = await this.prisma.forTenant(async (tx) => {
      await this.validatePolicyCapabilities(tx, data);
      await this.ensurePolicyName(tx, data.name);
      const policy = await this.uniqueConflict(
        tx.attendancePolicy.create({ data: { tenantId, ...data } }),
        'POLICY_NAME_EXISTS',
        'A policy with this name already exists',
      );
      await this.record(
        tx,
        'attendance.policy.created',
        'AttendancePolicy',
        policy.id,
        undefined,
        policy,
      );
      await bumpRuntimeConfigVersion(tx, tenantId);
      return { data: policy };
    });
    await this.policyCache.invalidate(tenantId);
    return result;
  }

  async updatePolicy(id: string, dto: UpdatePolicyDto) {
    const tenantId = this.tenantId();
    const result = await this.prisma.forTenant(async (tx) => {
      const current = await tx.attendancePolicy.findUnique({ where: { id } });
      if (!current) this.notFound('Policy');
      const data = this.policyData({
        ...current,
        ...dto,
        locationMode:
          dto.locationMode ??
          (dto.requireGeofence === undefined
            ? current.locationMode
            : dto.requireGeofence
              ? 'OFFICE_GEOFENCE'
              : 'NONE'),
        selfieMode:
          dto.selfieMode ??
          (dto.requireFaceMatch === undefined
            ? current.selfieMode
            : dto.requireFaceMatch
              ? 'REQUIRED'
              : 'DISABLED'),
        weeklyOffs:
          dto.weeklyOffs === undefined ? current.weeklyOffs : dto.weeklyOffs,
        breakRules:
          dto.breakRules ?? (current.breakRules as Record<string, unknown>),
      });
      await this.validatePolicyCapabilities(tx, data);
      await this.ensurePolicyName(tx, data.name, id);
      const policy = await this.uniqueConflict(
        tx.attendancePolicy.update({ where: { id }, data }),
        'POLICY_NAME_EXISTS',
        'A policy with this name already exists',
      );
      await this.record(
        tx,
        'attendance.policy.updated',
        'AttendancePolicy',
        id,
        current,
        policy,
      );
      await bumpRuntimeConfigVersion(tx, tenantId);
      return { data: policy };
    });
    await this.policyCache.invalidate(tenantId);
    return result;
  }

  async removePolicy(id: string) {
    const tenantId = this.tenantId();
    const result = await this.prisma.forTenant(async (tx) => {
      const policy = await tx.attendancePolicy.findUnique({
        where: { id },
        include: { _count: { select: { assignments: true } } },
      });
      if (!policy) this.notFound('Policy');
      if (policy._count.assignments)
        throw new ConflictException({
          code: 'POLICY_IN_USE',
          message: 'Policy cannot be deleted while assignments reference it',
        });
      await tx.attendancePolicy.delete({ where: { id } });
      await this.record(
        tx,
        'attendance.policy.deleted',
        'AttendancePolicy',
        id,
        policy,
        undefined,
      );
      await bumpRuntimeConfigVersion(tx, tenantId);
      return { success: true };
    });
    await this.policyCache.invalidate(tenantId);
    return result;
  }

  async replacePolicyAssignments(id: string, dto: ReplacePolicyAssignmentsDto) {
    const tenantId = this.tenantId();
    this.validatePolicyAssignments(dto);
    const result = await this.prisma.forTenant(async (tx) => {
      await this.requirePolicy(tx, id);
      await this.validateAssignmentTargets(tx, dto);
      await this.validatePolicyActivation(tx, id, dto);
      const oldValue = await tx.policyAssignment.findMany({
        where: { policyId: id },
      });
      await tx.policyAssignment.deleteMany({ where: { policyId: id } });
      if (dto.assignments.length) {
        try {
          await tx.policyAssignment.createMany({
            data: dto.assignments.map((assignment) => ({
              tenantId,
              policyId: id,
              scope: assignment.scope,
              deptId: assignment.deptId ?? null,
              employeeId: assignment.employeeId ?? null,
            })),
          });
        } catch (error) {
          if (this.isUniqueError(error))
            throw new ConflictException({
              code: 'POLICY_ASSIGNMENT_CONFLICT',
              message: 'An assignment already exists at this scope',
            });
          throw error;
        }
      }
      const assignments = await tx.policyAssignment.findMany({
        where: { policyId: id },
      });
      await this.record(
        tx,
        'attendance.policy.assignments.replaced',
        'AttendancePolicy',
        id,
        oldValue,
        assignments,
      );
      await bumpRuntimeConfigVersion(tx, tenantId);
      return { data: assignments };
    });
    await this.policyCache.invalidate(tenantId);
    return result;
  }

  async resolvePolicy(employeeId: string, date: string) {
    const tenantId = this.tenantId();
    const cached = await this.policyCache.get(tenantId, employeeId, date);
    if (cached.value !== undefined) return cached.value;
    const value = await this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, deptId: true },
      });
      if (!employee) this.notFound('Employee');
      const assignments = await tx.policyAssignment.findMany({
        where: {
          OR: [
            { scope: 'EMPLOYEE', employeeId },
            { scope: 'DEPARTMENT', deptId: employee.deptId },
            { scope: 'TENANT_DEFAULT' },
          ],
        },
        include: { policy: true },
      });
      const resolved = resolvePolicy(
        assignments.map((assignment) => ({
          scope: assignment.scope,
          value: assignment,
        })),
      );
      if (!resolved) this.notFound('Configuration');
      return {
        data: resolved.value.policy,
        resolution: {
          source: resolved.scope,
          assignmentId: resolved.value.id,
          effectiveDate: date,
        },
      };
    });
    await this.policyCache.set(
      tenantId,
      employeeId,
      date,
      cached.generation,
      value,
    );
    return value;
  }

  resolvePolicies(employeeIds: string[], date: string) {
    return this.prisma.forTenant(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { id: { in: employeeIds }, status: 'ACTIVE' },
        select: { id: true, deptId: true },
      });
      if (employees.length !== new Set(employeeIds).size)
        this.notFound('Employee');
      const deptIds = [
        ...new Set(employees.flatMap(({ deptId }) => (deptId ? [deptId] : []))),
      ];
      const assignments = await tx.policyAssignment.findMany({
        where: {
          OR: [
            { scope: 'EMPLOYEE', employeeId: { in: employeeIds } },
            { scope: 'DEPARTMENT', deptId: { in: deptIds } },
            { scope: 'TENANT_DEFAULT' },
          ],
        },
        include: { policy: true },
      });
      return {
        data: employees.map((employee) => {
          const resolved = resolvePolicy(
            assignments
              .filter(
                (assignment) =>
                  assignment.scope === 'TENANT_DEFAULT' ||
                  (assignment.scope === 'DEPARTMENT' &&
                    assignment.deptId === employee.deptId) ||
                  (assignment.scope === 'EMPLOYEE' &&
                    assignment.employeeId === employee.id),
              )
              .map((assignment) => ({
                scope: assignment.scope,
                value: assignment,
              })),
          );
          if (!resolved) this.notFound('Configuration');
          return {
            employeeId: employee.id,
            policy: resolved.value.policy,
            resolution: {
              source: resolved.scope,
              assignmentId: resolved.value.id,
              effectiveDate: date,
            },
          };
        }),
      };
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

  listRosters(query: RosterQueryDto) {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.employeeShiftRoster.findMany({
        where: {
          employeeId: query.employeeId,
          rosterDate:
            query.startDate || query.endDate
              ? {
                  gte: query.startDate ? dateOnly(query.startDate) : undefined,
                  lte: query.endDate ? dateOnly(query.endDate) : undefined,
                }
              : undefined,
        },
        include: {
          shift: true,
          employee: {
            select: { id: true, employeeCode: true, fullName: true },
          },
        },
        orderBy: [{ rosterDate: 'asc' }, { employee: { fullName: 'asc' } }],
      }),
    }));
  }

  createRoster(dto: CreateRosterDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await this.requireRosterReferences(tx, dto.employeeId, dto.shiftId);
      if (
        await this.isRosterHoliday(tx, dto.employeeId, dateOnly(dto.rosterDate))
      ) {
        throw new ConflictException({
          code: 'ROSTER_HOLIDAY',
          message: 'A roster cannot be assigned on this employee holiday',
        });
      }
      const existing = await tx.employeeShiftRoster.findFirst({
        where: {
          employeeId: dto.employeeId,
          rosterDate: dateOnly(dto.rosterDate),
        },
      });
      if (existing) {
        if (existing.shiftId === dto.shiftId)
          return { data: existing, idempotent: true };
        throw new ConflictException({
          code: 'ROSTER_CONFLICT',
          message: 'Employee already has a roster assignment for this date',
        });
      }
      const roster = await tx.employeeShiftRoster.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          shiftId: dto.shiftId,
          rosterDate: dateOnly(dto.rosterDate),
        },
      });
      await this.record(
        tx,
        'attendance.roster.created',
        'EmployeeShiftRoster',
        roster.id,
        undefined,
        roster,
      );
      return { data: roster };
    });
  }

  bulkRosters(dto: BulkRosterDto) {
    const start = dateOnly(dto.startDate);
    const end = dateOnly(dto.endDate);
    const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    if (days < 1 || days > 93)
      throw new BadRequestException({
        code: 'ROSTER_RANGE_INVALID',
        message: 'Roster range must contain between 1 and 93 days',
      });
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { id: { in: dto.employeeIds }, status: 'ACTIVE' },
        select: {
          id: true,
          officeAssignments: {
            where: { isPrimary: true },
            select: { officeLocationId: true },
          },
        },
      });
      if (
        employees.length !== dto.employeeIds.length ||
        !(await tx.shift.findUnique({ where: { id: dto.shiftId } }))
      )
        this.notFound('Configuration');
      const dates = dateRange(start, end).filter(
        (date) =>
          !dto.weekdays?.length || dto.weekdays.includes(date.getUTCDay()),
      );
      const requested = dto.employeeIds.flatMap((employeeId) =>
        dates.map((rosterDate) => ({
          tenantId,
          employeeId,
          shiftId: dto.shiftId,
          rosterDate,
        })),
      );
      const existing = await tx.employeeShiftRoster.findMany({
        where: {
          employeeId: { in: dto.employeeIds },
          rosterDate: { gte: start, lte: end },
        },
      });
      const key = (employeeId: string, rosterDate: Date) =>
        `${employeeId}:${rosterDate.toISOString().slice(0, 10)}`;
      const existingByKey = new Map(
        existing.map((row) => [key(row.employeeId, row.rosterDate), row]),
      );
      const holidays = await tx.tenantHoliday.findMany({
        where: { holidayDate: { gte: start, lte: end } },
        select: { holidayDate: true, officeLocationId: true },
      });
      const tenantHolidayDates = new Set(
        holidays
          .filter(({ officeLocationId }) => officeLocationId === null)
          .map(({ holidayDate }) => holidayDate.toISOString().slice(0, 10)),
      );
      const officeHolidayKeys = new Set(
        holidays
          .filter(({ officeLocationId }) => officeLocationId !== null)
          .map(
            ({ holidayDate, officeLocationId }) =>
              `${officeLocationId}:${holidayDate.toISOString().slice(0, 10)}`,
          ),
      );
      const primaryOfficeByEmployee = new Map(
        employees.map((employee) => [
          employee.id,
          employee.officeAssignments[0]?.officeLocationId,
        ]),
      );
      const errors: Array<{
        employeeId: string;
        rosterDate: string;
        code: string;
      }> = [];
      const inserts = requested.filter((row) => {
        const rosterDate = row.rosterDate.toISOString().slice(0, 10);
        const primaryOffice = primaryOfficeByEmployee.get(row.employeeId);
        if (
          tenantHolidayDates.has(rosterDate) ||
          (primaryOffice &&
            officeHolidayKeys.has(`${primaryOffice}:${rosterDate}`))
        ) {
          errors.push({
            employeeId: row.employeeId,
            rosterDate,
            code: 'ROSTER_HOLIDAY',
          });
          return false;
        }
        const found = existingByKey.get(key(row.employeeId, row.rosterDate));
        if (!found) return true;
        if (found.shiftId !== dto.shiftId)
          errors.push({
            employeeId: row.employeeId,
            rosterDate: row.rosterDate.toISOString().slice(0, 10),
            code: 'ROSTER_CONFLICT',
          });
        return false;
      });
      if (inserts.length)
        await tx.employeeShiftRoster.createMany({ data: inserts });
      await this.record(
        tx,
        'attendance.rosters.bulk_created',
        'EmployeeShiftRoster',
        undefined,
        undefined,
        { requested: requested.length, inserted: inserts.length, errors },
      );
      return {
        data: {
          requested: requested.length,
          inserted: inserts.length,
          unchanged: requested.length - inserts.length - errors.length,
          errors,
        },
      };
    });
  }

  removeRoster(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const roster = await tx.employeeShiftRoster.findUnique({ where: { id } });
      if (!roster) this.notFound('Configuration');
      await tx.employeeShiftRoster.delete({ where: { id } });
      await this.record(
        tx,
        'attendance.roster.deleted',
        'EmployeeShiftRoster',
        id,
        roster,
        undefined,
      );
      return { success: true };
    });
  }

  resolveShift(employeeId: string, date: string) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: { defaultShift: true },
      });
      if (!employee) this.notFound('Employee');
      const roster = await tx.employeeShiftRoster.findFirst({
        where: { employeeId, rosterDate: dateOnly(date) },
        include: { shift: true },
      });
      const flexible = await tx.shift.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      const resolution = resolveShift({
        roster: roster?.shift,
        employeeDefault: employee.defaultShift,
        flexible,
      });
      if (!resolution) this.notFound('Configuration');
      return {
        data: serializeShift(resolution.value),
        resolution: { source: resolution.source, rosterId: roster?.id ?? null },
      };
    });
  }

  resolveShifts(employeeIds: string[], date: string) {
    return this.prisma.forTenant(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { id: { in: employeeIds }, status: 'ACTIVE' },
        include: { defaultShift: true },
      });
      if (employees.length !== new Set(employeeIds).size)
        this.notFound('Employee');
      const rosters = await tx.employeeShiftRoster.findMany({
        where: {
          employeeId: { in: employeeIds },
          rosterDate: dateOnly(date),
        },
        include: { shift: true },
      });
      const rosterByEmployee = new Map(
        rosters.map((roster) => [roster.employeeId, roster]),
      );
      const flexible = await tx.shift.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      return {
        data: employees.map((employee) => {
          const roster = rosterByEmployee.get(employee.id);
          const resolution = resolveShift({
            roster: roster?.shift,
            employeeDefault: employee.defaultShift,
            flexible,
          });
          if (!resolution) this.notFound('Configuration');
          return {
            employeeId: employee.id,
            shift: serializeShift(resolution.value),
            resolution: {
              source: resolution.source,
              rosterId: roster?.id ?? null,
            },
          };
        }),
      };
    });
  }

  listHolidays() {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.tenantHoliday.findMany({
        include: { office: true },
        orderBy: { holidayDate: 'asc' },
      }),
    }));
  }

  createHoliday(dto: CreateHolidayDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      if (dto.officeLocationId)
        await this.requireOffice(tx, dto.officeLocationId);
      await this.ensureHolidayUnique(tx, dto.holidayDate, dto.officeLocationId);
      const holiday = await this.uniqueConflict(
        tx.tenantHoliday.create({
          data: {
            tenantId,
            holidayName: normalizeName(dto.holidayName),
            holidayDate: dateOnly(dto.holidayDate),
            officeLocationId: dto.officeLocationId ?? null,
          },
        }),
        'HOLIDAY_EXISTS',
        'A holiday already exists for this date and scope',
      );
      await this.record(
        tx,
        'attendance.holiday.created',
        'TenantHoliday',
        holiday.id,
        undefined,
        holiday,
      );
      return { data: holiday };
    });
  }

  updateHoliday(id: string, dto: UpdateHolidayDto) {
    return this.prisma.forTenant(async (tx) => {
      const current = await tx.tenantHoliday.findUnique({ where: { id } });
      if (!current) this.notFound('Configuration');
      const officeLocationId =
        dto.officeLocationId === undefined
          ? (current.officeLocationId ?? undefined)
          : dto.officeLocationId;
      if (officeLocationId) await this.requireOffice(tx, officeLocationId);
      const holidayDate =
        dto.holidayDate ?? current.holidayDate.toISOString().slice(0, 10);
      await this.ensureHolidayUnique(tx, holidayDate, officeLocationId, id);
      const holiday = await this.uniqueConflict(
        tx.tenantHoliday.update({
          where: { id },
          data: {
            holidayName: dto.holidayName
              ? normalizeName(dto.holidayName)
              : current.holidayName,
            holidayDate: dateOnly(holidayDate),
            officeLocationId: officeLocationId ?? null,
          },
        }),
        'HOLIDAY_EXISTS',
        'A holiday already exists for this date and scope',
      );
      await this.record(
        tx,
        'attendance.holiday.updated',
        'TenantHoliday',
        id,
        current,
        holiday,
      );
      return { data: holiday };
    });
  }

  removeHoliday(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const holiday = await tx.tenantHoliday.findUnique({ where: { id } });
      if (!holiday) this.notFound('Configuration');
      await tx.tenantHoliday.delete({ where: { id } });
      await this.record(
        tx,
        'attendance.holiday.deleted',
        'TenantHoliday',
        id,
        holiday,
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

  private policyData(dto: CreatePolicyDto) {
    const locationMode =
      dto.locationMode ??
      (dto.requireGeofence === false ? 'NONE' : 'OFFICE_GEOFENCE');
    const selfieMode =
      dto.selfieMode ?? (dto.requireFaceMatch ? 'REQUIRED' : 'DISABLED');
    const data = {
      name: normalizeName(dto.name),
      lateAfterMinutes: dto.lateAfterMinutes ?? 15,
      halfDayAfterMinutes: dto.halfDayAfterMinutes ?? 240,
      minimumWorkMinutes: dto.minimumWorkMinutes ?? 480,
      overtimeAfterMinutes: dto.overtimeAfterMinutes ?? 540,
      allowEarlyCheckin: dto.allowEarlyCheckin ?? true,
      allowEarlyCheckout: dto.allowEarlyCheckout ?? false,
      requireFaceMatch: selfieMode === 'REQUIRED',
      allowBiometricOptOut: dto.allowBiometricOptOut ?? false,
      requireRegisteredDevice: dto.requireRegisteredDevice ?? true,
      requireGeofence: locationMode !== 'NONE',
      locationMode,
      selfieMode,
      fieldTrackingEnabled: dto.fieldTrackingEnabled ?? false,
      allowHybridFieldTracking: dto.allowHybridFieldTracking ?? false,
      maxOfflineSyncHours: dto.maxOfflineSyncHours ?? 48,
      maxFaceAttempts: dto.maxFaceAttempts ?? 3,
      weeklyOffs:
        dto.weeklyOffs == null
          ? Prisma.JsonNull
          : (normalizeWeeklyOffs(dto.weeklyOffs) as Prisma.InputJsonValue),
      breakRules: (dto.breakRules ?? {}) as Prisma.InputJsonValue,
    };
    if (data.selfieMode === 'REQUIRED' && !canEnforceBiometrics()) {
      throw new BadRequestException({
        code: 'BIOMETRICS_NOT_CERTIFIED',
        message:
          'Face matching cannot be required until production biometric certification is enabled',
      });
    }
    assertPolicyRules(data);
    return data;
  }

  private async validatePolicyCapabilities(
    tx: PrismaTransaction,
    policy: {
      fieldTrackingEnabled: boolean;
      selfieMode: string;
      locationMode: string;
    },
  ) {
    if (policy.selfieMode === 'REQUIRED' && !canEnforceBiometrics()) {
      throw new BadRequestException({
        code: 'BIOMETRIC_PROVIDER_UNAVAILABLE',
        message: 'Face verification is not available in this environment',
      });
    }
    if (!policy.fieldTrackingEnabled && policy.locationMode !== 'FIELD_GPS')
      return;
    const entitled = await tx.tenantModule.findFirst({
      where: {
        tenantId: this.tenantId(),
        isActive: true,
        module: { key: 'FIELD_TRACKING', availability: 'AVAILABLE' },
      },
      select: { id: true },
    });
    if (!entitled) {
      throw new BadRequestException({
        code: 'MODULE_ACCESS_DENIED',
        message: 'FIELD_TRACKING must be entitled before enabling this policy',
      });
    }
  }

  private async validatePolicyActivation(
    tx: PrismaTransaction,
    policyId: string,
    dto: ReplacePolicyAssignmentsDto,
  ) {
    if (!dto.assignments.length) return;
    const policy = await tx.attendancePolicy.findUnique({
      where: { id: policyId },
    });
    if (!policy) this.notFound('Policy');
    if (policy.locationMode !== 'OFFICE_GEOFENCE') return;
    const [employees, existingAssignments] = await Promise.all([
      tx.employee.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          deptId: true,
          officeAssignments: { select: { id: true }, take: 1 },
        },
      }),
      tx.policyAssignment.findMany({
        where: { policyId: { not: policyId } },
        select: {
          policyId: true,
          scope: true,
          deptId: true,
          employeeId: true,
        },
      }),
    ]);
    const prospective = [
      ...existingAssignments,
      ...dto.assignments.map((assignment) => ({
        policyId,
        scope: assignment.scope,
        deptId: assignment.deptId ?? null,
        employeeId: assignment.employeeId ?? null,
      })),
    ];
    const missingOffice = employees.filter((employee) => {
      const effective =
        prospective.find(
          (assignment) =>
            assignment.scope === 'EMPLOYEE' &&
            assignment.employeeId === employee.id,
        ) ??
        prospective.find(
          (assignment) =>
            assignment.scope === 'DEPARTMENT' &&
            assignment.deptId === employee.deptId,
        ) ??
        prospective.find((assignment) => assignment.scope === 'TENANT_DEFAULT');
      return (
        effective?.policyId === policyId && !employee.officeAssignments.length
      );
    });
    if (missingOffice.length) {
      throw new BadRequestException({
        code: 'OFFICE_CONFIGURATION_REQUIRED',
        message:
          'Assign an office to every affected employee before activating an office-geofence policy',
        details: { affectedEmployeeCount: missingOffice.length },
      });
    }
  }

  private validatePolicyAssignments(dto: ReplacePolicyAssignmentsDto) {
    const keys = dto.assignments.map(
      (assignment) =>
        `${assignment.scope}:${assignment.deptId ?? assignment.employeeId ?? 'default'}`,
    );
    if (
      new Set(keys).size !== keys.length ||
      dto.assignments.some(
        (assignment) =>
          (assignment.scope === 'TENANT_DEFAULT' &&
            (assignment.deptId || assignment.employeeId)) ||
          (assignment.scope === 'DEPARTMENT' &&
            (!assignment.deptId || assignment.employeeId)) ||
          (assignment.scope === 'EMPLOYEE' &&
            (!assignment.employeeId || assignment.deptId)),
      )
    ) {
      throw new ConflictException({
        code: 'POLICY_ASSIGNMENT_CONFLICT',
        message: 'Policy assignment scope and target are invalid or duplicated',
      });
    }
  }

  private async validateAssignmentTargets(
    tx: PrismaTransaction,
    dto: ReplacePolicyAssignmentsDto,
  ) {
    const deptIds = dto.assignments.flatMap((item) =>
      item.deptId ? [item.deptId] : [],
    );
    const employeeIds = dto.assignments.flatMap((item) =>
      item.employeeId ? [item.employeeId] : [],
    );
    const [departments, employees] = await Promise.all([
      tx.department.count({ where: { id: { in: deptIds } } }),
      tx.employee.count({
        where: { id: { in: employeeIds }, status: 'ACTIVE' },
      }),
    ]);
    if (departments !== deptIds.length || employees !== employeeIds.length)
      this.notFound('Configuration');
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
  private async ensurePolicyName(
    tx: PrismaTransaction,
    name: string,
    excludeId?: string,
  ) {
    if (
      await tx.attendancePolicy.findFirst({
        where: {
          id: excludeId ? { not: excludeId } : undefined,
          name: { equals: name, mode: 'insensitive' },
        },
      })
    )
      throw new ConflictException({
        code: 'POLICY_NAME_EXISTS',
        message: 'A policy with this name already exists',
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
  private async ensureHolidayUnique(
    tx: PrismaTransaction,
    date: string,
    officeLocationId?: string,
    excludeId?: string,
  ) {
    if (
      await tx.tenantHoliday.findFirst({
        where: {
          id: excludeId ? { not: excludeId } : undefined,
          holidayDate: dateOnly(date),
          officeLocationId: officeLocationId ?? null,
        },
      })
    )
      throw new ConflictException({
        code: 'HOLIDAY_EXISTS',
        message: 'A holiday already exists for this date and scope',
      });
  }
  private async requireOffice(tx: PrismaTransaction, id: string) {
    if (!(await tx.officeLocation.findUnique({ where: { id } })))
      this.notFound('Office');
  }
  private async requirePolicy(tx: PrismaTransaction, id: string) {
    if (!(await tx.attendancePolicy.findUnique({ where: { id } })))
      this.notFound('Policy');
  }
  private async requireRosterReferences(
    tx: PrismaTransaction,
    employeeId: string,
    shiftId: string,
  ) {
    const [employee, shift] = await Promise.all([
      tx.employee.findUnique({ where: { id: employeeId } }),
      tx.shift.findUnique({ where: { id: shiftId } }),
    ]);
    if (!employee || employee.status !== 'ACTIVE' || !shift)
      this.notFound('Configuration');
  }
  private async isRosterHoliday(
    tx: PrismaTransaction,
    employeeId: string,
    rosterDate: Date,
  ) {
    const primaryOffice = await tx.employeeOfficeAssignment.findFirst({
      where: { employeeId, isPrimary: true },
      select: { officeLocationId: true },
    });
    return Boolean(
      await tx.tenantHoliday.findFirst({
        where: {
          holidayDate: rosterDate,
          OR: [
            { officeLocationId: null },
            ...(primaryOffice
              ? [{ officeLocationId: primaryOffice.officeLocationId }]
              : []),
          ],
        },
      }),
    );
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
function dateRange(start: Date, end: Date) {
  const values: Date[] = [];
  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = new Date(cursor.getTime() + 86_400_000)
  )
    values.push(cursor);
  return values;
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkType } from '@prisma/client';
import { DateTime } from 'luxon';
import type { MessageEvent } from '@nestjs/common';
import {
  Observable,
  filter,
  from,
  interval,
  map,
  merge,
  startWith,
  switchMap,
  take,
  takeUntil,
  timer,
} from 'rxjs';
import {
  PrismaService,
  PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { TenantContextService } from '../../../../platform/tenancy/public';
import { collectReportingEmployeeIds } from '../../../../platform/organization/public';
import { FieldPresenceService } from '../field-presence.service';
import { summarizeRoute } from './route-summarizer';
import type { AuthenticatedUser } from '../../../../shared/http/authenticated-user';

@Injectable()
export class FieldRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly presence: FieldPresenceService,
  ) {}

  live() {
    return this.prisma.forTenant(async (tx) => {
      const scopedIds = await this.scopedEmployeeIds(tx);
      const employees = await tx.employee.findMany({
        where: {
          id: scopedIds ? { in: scopedIds } : undefined,
          status: 'ACTIVE',
          workType: { in: [WorkType.FIELD, WorkType.HYBRID] },
        },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          workType: true,
          deptId: true,
          designationId: true,
        },
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      });
      const employeeIds = employees.map(({ id }) => id);
      const departments = await tx.department.findMany({
        where: {
          id: { in: [...new Set(employees.map(({ deptId }) => deptId))] },
        },
        select: { id: true, name: true },
      });
      const designationIds = employees.flatMap(({ designationId }) =>
        designationId ? [designationId] : [],
      );
      const designations = await tx.designation.findMany({
        where: { id: { in: [...new Set(designationIds)] } },
        select: { id: true, name: true },
      });
      const assignments = await tx.employeeOfficeAssignment.findMany({
        where: { employeeId: { in: employeeIds }, isPrimary: true },
        select: { employeeId: true, officeLocationId: true },
        orderBy: { id: 'asc' },
      });
      const officeIds = assignments.map(
        ({ officeLocationId }) => officeLocationId,
      );
      const offices = await tx.officeLocation.findMany({
        where: { id: { in: [...new Set(officeIds)] } },
        select: {
          id: true,
          officeName: true,
          latitude: true,
          longitude: true,
          radiusMeters: true,
        },
      });
      const sessions = await tx.fieldTrackingSession.findMany({
        where: { employeeId: { in: employeeIds }, endedAt: null },
      });
      const latestPings = await tx.fieldLocationPing.findMany({
        where: { employeeId: { in: employeeIds } },
        orderBy: { capturedAt: 'desc' },
        distinct: ['employeeId'],
      });
      const cached = await this.presence.getMany(
        this.requireTenantId(),
        employeeIds,
      );
      const sessionsByEmployee = new Map(
        sessions.map((session) => [session.employeeId, session]),
      );
      const pingsByEmployee = new Map(
        latestPings.map((ping) => [ping.employeeId, ping]),
      );
      const departmentsById = new Map(
        departments.map((department) => [department.id, department]),
      );
      const designationsById = new Map(
        designations.map((designation) => [designation.id, designation]),
      );
      const officesById = new Map(offices.map((office) => [office.id, office]));
      const primaryOfficeByEmployee = new Map(
        assignments.map((assignment) => [
          assignment.employeeId,
          officesById.get(assignment.officeLocationId) ?? null,
        ]),
      );
      return {
        data: employees.map((employee) => {
          const session = sessionsByEmployee.get(employee.id);
          const cachedPing = cached.get(employee.id);
          const storedPing = pingsByEmployee.get(employee.id);
          const point =
            cachedPing ?? (storedPing ? serializePing(storedPing) : null);
          return {
            id: employee.id,
            employeeCode: employee.employeeCode,
            fullName: employee.fullName,
            workType: employee.workType,
            department: departmentsById.get(employee.deptId) ?? null,
            designation: employee.designationId
              ? (designationsById.get(employee.designationId)?.name ?? null)
              : null,
            office: primaryOfficeByEmployee.get(employee.id) ?? null,
            session: session
              ? {
                  id: session.id,
                  startedAt: session.startedAt,
                  lastPingAt: session.lastPingAt,
                }
              : null,
            presence: presenceState(point?.capturedAt, !!session),
            location: point,
          };
        }),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  route(employeeId: string, date: string) {
    assertDate(date);
    return this.prisma.forTenant(async (tx) => {
      await this.assertScoped(tx, employeeId);
      let summary = await tx.fieldRouteSummary.findUnique({
        where: {
          tenantId_employeeId_routeDate: {
            tenantId: this.requireTenantId(),
            employeeId,
            routeDate: dateValue(date),
          },
        },
      });
      if (!summary)
        summary = await this.rebuildInTransaction(tx, employeeId, date);
      if (!summary) {
        throw new NotFoundException({
          code: 'ROUTE_NOT_FOUND',
          message: 'No field route data exists for this date',
        });
      }
      const punches = await tx.attendanceEvent.findMany({
        where: {
          employeeId,
          eventTime: {
            gte: summary.sourceStartedAt ?? undefined,
            lte: summary.sourceEndedAt ?? undefined,
          },
        },
        select: {
          id: true,
          eventType: true,
          eventTime: true,
          latitude: true,
          longitude: true,
        },
        orderBy: { eventTime: 'asc' },
      });
      return { data: { ...summary, punches } };
    });
  }

  rebuild(employeeId: string, date: string) {
    assertDate(date);
    return this.prisma.forTenant((tx) =>
      this.rebuildInTransaction(tx, employeeId, date),
    );
  }

  rebuildForInstant(employeeId: string, instant: Date) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: {
          officeAssignments: {
            where: { isPrimary: true },
            take: 1,
            include: { office: { select: { timezone: true } } },
          },
        },
      });
      if (!employee) return null;
      const settings = await tx.tenantSettings.findUnique({
        where: { tenantId: this.requireTenantId() },
        select: { timezone: true },
      });
      const zone =
        employee.officeAssignments[0]?.office.timezone ??
        settings?.timezone ??
        'UTC';
      const date = DateTime.fromJSDate(instant, { zone }).toISODate()!;
      return this.rebuildInTransaction(tx, employeeId, date);
    });
  }

  async stream(
    user: AuthenticatedUser,
    lastEventId?: string,
  ): Promise<Observable<MessageEvent>> {
    const scopedIds = await this.prisma.forTenant((tx) =>
      this.scopedEmployeeIds(tx),
    );
    const allowed = scopedIds ? new Set(scopedIds) : undefined;
    const tenantId = this.requireTenantId();
    const events = merge(
      this.presence.localStream(tenantId),
      this.presence.redisStream(tenantId, lastEventId),
    ).pipe(
      filter((event) => !allowed || allowed.has(event.data.employeeId)),
      map((event): MessageEvent => ({
        id: event.id,
        type: event.event,
        data: event.data,
      })),
    );
    const heartbeat = interval(25_000).pipe(
      map((): MessageEvent => ({
        type: 'heartbeat',
        data: { at: new Date().toISOString() },
      })),
    );
    const tokenExpiry = timer(millisecondsUntilExpiry(user.exp));
    const revoked = interval(25_000).pipe(
      startWith(0),
      switchMap(() => from(this.connectionRevoked(user))),
      filter(Boolean),
      take(1),
    );
    return merge(events, heartbeat).pipe(
      takeUntil(tokenExpiry),
      takeUntil(revoked),
    );
  }

  private connectionRevoked(user: AuthenticatedUser) {
    return this.prisma.forAdmin(async (tx) => {
      const current = await tx.user.findFirst({
        where: { id: user.userId, tenantId: user.tenantId },
        select: { status: true },
      });
      if (current?.status !== 'ACTIVE') return true;
      if (!user.deviceId) return false;
      const device = await tx.registeredDevice.findFirst({
        where: { id: user.deviceId, tenantId: user.tenantId },
        select: { status: true },
      });
      return device?.status !== 'ACTIVE';
    });
  }

  private async rebuildInTransaction(
    tx: PrismaTransaction,
    employeeId: string,
    date: string,
  ) {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      include: {
        officeAssignments: {
          where: { isPrimary: true },
          take: 1,
          include: { office: { select: { timezone: true } } },
        },
      },
    });
    if (!employee) return null;
    const settings = await tx.tenantSettings.findUnique({
      where: { tenantId: this.requireTenantId() },
      select: { timezone: true },
    });
    const zone =
      employee.officeAssignments[0]?.office.timezone ??
      settings?.timezone ??
      'UTC';
    const start = DateTime.fromISO(date, { zone }).startOf('day');
    const end = start.plus({ days: 1 });
    const pings = await tx.fieldLocationPing.findMany({
      where: {
        employeeId,
        capturedAt: { gte: start.toJSDate(), lt: end.toJSDate() },
      },
      orderBy: [{ capturedAt: 'asc' }, { id: 'asc' }],
    });
    if (!pings.length) return null;
    const route = summarizeRoute(
      pings.map((ping) => ({
        id: ping.id,
        latitude: Number(ping.latitude),
        longitude: Number(ping.longitude),
        accuracyM: ping.accuracyM,
        speedMps: ping.speedMps === null ? null : Number(ping.speedMps),
        capturedAt: ping.capturedAt,
      })),
    );
    return tx.fieldRouteSummary.upsert({
      where: {
        tenantId_employeeId_routeDate: {
          tenantId: this.requireTenantId(),
          employeeId,
          routeDate: dateValue(date),
        },
      },
      create: {
        tenantId: this.requireTenantId(),
        employeeId,
        routeDate: dateValue(date),
        simplifiedPath: route.path,
        distanceMeters: route.distanceMeters,
        pingCount: route.pingCount,
        trackingGapMinutes: route.trackingGapMinutes,
        stops: route.stops,
        gaps: route.gaps,
        sourceStartedAt: route.sourceStartedAt,
        sourceEndedAt: route.sourceEndedAt,
      },
      update: {
        simplifiedPath: route.path,
        distanceMeters: route.distanceMeters,
        pingCount: route.pingCount,
        trackingGapMinutes: route.trackingGapMinutes,
        stops: route.stops,
        gaps: route.gaps,
        sourceStartedAt: route.sourceStartedAt,
        sourceEndedAt: route.sourceEndedAt,
        algorithmVersion: { increment: 1 },
      },
    });
  }

  private async scopedEmployeeIds(tx: PrismaTransaction) {
    const user = await tx.user.findUnique({
      where: { id: this.requireUserId() },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    const roleNames = new Set(user?.roles.map(({ role }) => role.name) ?? []);
    if (roleNames.has('BUSINESS_ADMIN') || roleNames.has('HR_ADMIN'))
      return undefined;
    const employee = await tx.employee.findFirst({
      where: { userId: this.requireUserId(), status: 'ACTIVE' },
      select: { id: true },
    });
    if (!employee) return [];
    const nodes = await tx.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, managerId: true },
    });
    return collectReportingEmployeeIds(employee.id, nodes);
  }

  private async assertScoped(tx: PrismaTransaction, employeeId: string) {
    const scope = await this.scopedEmployeeIds(tx);
    if (scope && !scope.includes(employeeId)) {
      throw new ForbiddenException({
        code: 'FIELD_EMPLOYEE_SCOPE_DENIED',
        message: 'This employee is outside your reporting scope',
      });
    }
  }

  private requireTenantId() {
    const tenantId = this.context.tenantId;
    if (!tenantId) throw new Error('TENANT_CONTEXT_REQUIRED');
    return tenantId;
  }

  private requireUserId() {
    const userId = this.context.userId;
    if (!userId) throw new Error('USER_CONTEXT_REQUIRED');
    return userId;
  }
}

function serializePing(ping: {
  sessionId: string;
  employeeId: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  accuracyM: number | null;
  speedMps: Prisma.Decimal | null;
  batteryLevel: number | null;
  capturedAt: Date;
}) {
  return {
    employeeId: ping.employeeId,
    sessionId: ping.sessionId,
    latitude: Number(ping.latitude),
    longitude: Number(ping.longitude),
    accuracyM: ping.accuracyM,
    speedMps: ping.speedMps === null ? null : Number(ping.speedMps),
    batteryLevel: ping.batteryLevel,
    capturedAt: ping.capturedAt.toISOString(),
  };
}

function presenceState(capturedAt: string | undefined, active: boolean) {
  if (!capturedAt || !active) return 'OFFLINE';
  const age = Date.now() - new Date(capturedAt).getTime();
  const liveMs = Number(process.env.FIELD_PRESENCE_TTL_SECONDS ?? 180) * 1_000;
  if (age <= liveMs) return 'LIVE';
  if (age <= 15 * 60_000) return 'STALE';
  return 'OFFLINE';
}

function assertDate(date: string) {
  const parsed = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'utc' });
  if (!parsed.isValid || parsed.toFormat('yyyy-MM-dd') !== date) {
    throw new NotFoundException({
      code: 'ROUTE_DATE_INVALID',
      message: 'Route date is invalid',
    });
  }
}

function dateValue(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function millisecondsUntilExpiry(exp?: number) {
  if (!exp) return 15 * 60_000;
  return Math.max(0, exp * 1_000 - Date.now());
}

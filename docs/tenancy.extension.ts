// =====================================================================
// tenancy.extension.ts — the glue between NestJS requests and Postgres RLS
// ---------------------------------------------------------------------
// Contract: NO tenant-scoped query may run outside forTenant().
// The RLS policies fail closed (missing app.tenant_id => 0 rows), so a
// forgotten wrapper surfaces as "no data" in dev, never as a leak.
//
// Three pieces:
//   1. TenantContext  — AsyncLocalStorage carrying { tenantId, userId, roles }
//   2. TenancyMiddleware — resolves subdomain -> tenant, seeds the ALS store
//   3. PrismaService.forTenant() — interactive transaction that issues
//      SET LOCAL app.tenant_id before your queries, on the app_user role
// Background jobs re-enter the same context from their payload (§3.4.4).
// =====================================================================

import { AsyncLocalStorage } from 'node:async_hooks';
import {
  Injectable, NestMiddleware, OnModuleInit,
  UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------
// 1. Request context
// ---------------------------------------------------------------
export interface RequestContext {
  tenantId: string;
  userId?: string;
  employeeId?: string;
  roles: string[];
  requestId: string;
  impersonationSessionId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function currentContext(): RequestContext {
  const ctx = requestContext.getStore();
  if (!ctx) {
    // Thrown, not defaulted: running tenant code without context is a bug.
    throw new Error('RequestContext missing — did a job forget runWithContext()?');
  }
  return ctx;
}

/** Used by BullMQ processors: every job payload carries tenantId. */
export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return requestContext.run(ctx, fn);
}

// ---------------------------------------------------------------
// 2. Tenant resolution middleware (subdomain -> tenant, cached)
// ---------------------------------------------------------------
@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(private readonly tenants: TenantCacheService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const host = req.hostname;                       // acme.yourhrms.com
    const subdomain = host.split('.')[0];
    const tenant = await this.tenants.bySubdomain(subdomain); // Redis-cached
    if (!tenant) throw new UnauthorizedException('Unknown workspace');
    if (tenant.status === 'SUSPENDED' || tenant.status === 'CHURNED') {
      throw new ForbiddenException('Workspace suspended'); // enforcement point §1.5.5
    }

    const ctx: RequestContext = {
      tenantId: tenant.id,
      requestId: (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
      roles: [],
      // userId/roles are attached later by the JWT guard, which MUST also
      // assert token.tenant_id === ctx.tenantId (URL/token mismatch => 401).
    };
    requestContext.run(ctx, () => next());
  }
}

// ---------------------------------------------------------------
// 3. Prisma with RLS-scoped transactions
// ---------------------------------------------------------------
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }

  /**
   * All tenant-scoped data access goes through here.
   * SET LOCAL binds app.tenant_id to THIS transaction only, so pooled
   * connections can never bleed tenant context between requests.
   *
   *   const day = await prisma.forTenant(async (tx) =>
   *     tx.attendanceLog.findUnique({ where: { ... } }));
   */
  forTenant<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    opts?: { tenantId?: string; isolation?: Prisma.TransactionIsolationLevel },
  ): Promise<T> {
    const tenantId = opts?.tenantId ?? currentContext().tenantId;
    return this.$transaction(
      async (tx) => {
        // Parameterized to keep injection impossible even here.
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
        return fn(tx);
      },
      { isolationLevel: opts?.isolation ?? Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}

// ---------------------------------------------------------------
// Repository usage pattern (attendance example)
// ---------------------------------------------------------------
// Note the row lock: two punches from two devices for the same employee
// serialize on the AttendanceDay row instead of racing the calculator.
@Injectable()
export class PrismaAttendanceDayRepository /* implements AttendanceDayRepository */ {
  constructor(private readonly prisma: PrismaService) {}

  findForUpdate(tx: Prisma.TransactionClient, employeeId: string, date: string) {
    return tx.$queryRaw<AttendanceLogRow[]>`
      SELECT * FROM attendance_logs
      WHERE tenant_id = current_setting('app.tenant_id')::uuid
        AND employee_id = ${employeeId}::uuid
        AND attendance_date = ${date}::date
      FOR UPDATE
    `.then((rows) => rows[0] ?? null);
  }

  /** Aggregate + its new events + outbox rows, atomically. */
  async saveWithEvents(
    tx: Prisma.TransactionClient,
    log: Prisma.AttendanceLogUncheckedCreateInput,
    newEvents: Prisma.AttendanceEventUncheckedCreateInput[],
    domainEvents: { eventKey: string; payload: unknown }[],
  ) {
    await tx.attendanceLog.upsert({
      where: {
        tenantId_employeeId_attendanceDate: {
          tenantId: log.tenantId,
          employeeId: log.employeeId,
          attendanceDate: log.attendanceDate as Date,
        },
      },
      create: log,
      update: log,
    });
    if (newEvents.length) await tx.attendanceEvent.createMany({ data: newEvents });
    if (domainEvents.length) {
      await tx.outboxEvent.createMany({
        data: domainEvents.map((e) => ({
          tenantId: log.tenantId,
          eventKey: e.eventKey,
          payload: e.payload as Prisma.InputJsonValue,
        })),
      });
    }
  }
}

type AttendanceLogRow = Record<string, unknown>;
declare class TenantCacheService {
  bySubdomain(s: string): Promise<{ id: string; status: string } | null>;
}

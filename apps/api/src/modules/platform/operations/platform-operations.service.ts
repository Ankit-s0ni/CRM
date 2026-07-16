import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AlertStatus,
  BillingPeriod,
  Prisma,
  SubscriptionStatus,
  TenantStatus,
} from '@prisma/client';
import { HealthService } from '../../../shared/health/health.service';
import type { PrismaTransaction } from '../../../shared/database/prisma.service';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import { PlatformDatabaseService } from '../platform-auth/platform-database.service';
import {
  ListSystemAlertsQueryDto,
  ListSystemAuditQueryDto,
  SystemAlertDecisionDto,
} from './dto/platform-operations.dto';

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class PlatformOperationsService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly health: HealthService,
  ) {}

  dashboard() {
    return this.database.transaction(async (tx) => {
      const [tenants, employees, subscriptions, failedPayments, recentTenants] =
        await Promise.all([
          tx.tenant.groupBy({ by: ['status'], _count: { _all: true } }),
          tx.employee.count(),
          tx.tenantSubscription.findMany({
            where: {
              status: {
                in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
              },
            },
            include: { plan: true },
          }),
          tx.paymentTransaction.count({ where: { status: 'FAILED' } }),
          tx.tenant.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
          }),
        ]);

      const recentSubscriptions = await tx.tenantSubscription.findMany({
        where: { tenantId: { in: recentTenants.map((tenant) => tenant.id) } },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      });
      const recentSubscriptionByTenant = new Map(
        recentSubscriptions.map((subscription) => [
          subscription.tenantId,
          subscription,
        ]),
      );

      const statusCounts = Object.fromEntries(
        tenants.map((item) => [item.status, item._count._all]),
      );
      const planMix = new Map<string, { name: string; tenants: number }>();
      let projectedMrr = 0;
      for (const subscription of subscriptions) {
        const monthlyPrice =
          Number(subscription.plan.pricePerUser) /
          (subscription.plan.billingPeriod === BillingPeriod.YEARLY ? 12 : 1);
        projectedMrr += monthlyPrice * subscription.seatCount;
        const current = planMix.get(subscription.planId) ?? {
          name: subscription.plan.name,
          tenants: 0,
        };
        current.tenants += 1;
        planMix.set(subscription.planId, current);
      }

      return {
        metrics: {
          tenants: tenants.reduce((sum, item) => sum + item._count._all, 0),
          activeTenants:
            (statusCounts[TenantStatus.ACTIVE] ?? 0) +
            (statusCounts[TenantStatus.TRIAL] ?? 0),
          suspendedTenants: statusCounts[TenantStatus.SUSPENDED] ?? 0,
          employees,
          projectedMrr: Math.round(projectedMrr * 100) / 100,
          currency: subscriptions[0]?.plan.currency ?? 'INR',
          failedPayments,
        },
        planMix: [...planMix.entries()].map(([planId, value]) => ({
          planId,
          ...value,
        })),
        recentTenants: recentTenants.map((tenant) => ({
          ...tenant,
          plan: recentSubscriptionByTenant.get(tenant.id)?.plan.name ?? null,
          subscriptionStatus:
            recentSubscriptionByTenant.get(tenant.id)?.status ?? null,
        })),
      };
    });
  }

  listAudit(query: ListSystemAuditQueryDto) {
    return this.database.transaction(async (tx) => {
      const where: Prisma.SystemAuditLogWhereInput = {
        actorPlatformUserId: query.actorId,
        tenantId: query.tenantId,
        module: query.module,
        createdAt:
          query.from || query.to
            ? {
                gte: query.from ? new Date(query.from) : undefined,
                lte: query.to ? new Date(query.to) : undefined,
              }
            : undefined,
        OR: query.search
          ? [
              { action: { contains: query.search, mode: 'insensitive' } },
              { module: { contains: query.search, mode: 'insensitive' } },
              { requestId: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      };
      const [data, total] = await Promise.all([
        tx.systemAuditLog.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.systemAuditLog.count({ where }),
      ]);
      return {
        data: await this.enrichAudit(tx, data),
        pagination: this.pagination(query.page, query.limit, total),
      };
    });
  }

  getAudit(id: string) {
    return this.database.transaction(async (tx) => {
      const audit = await tx.systemAuditLog.findUnique({ where: { id } });
      if (!audit) this.notFound('AUDIT_LOG_NOT_FOUND', 'Audit log');
      return (await this.enrichAudit(tx, [audit]))[0];
    });
  }

  listAlerts(query: ListSystemAlertsQueryDto) {
    return this.database.transaction(async (tx) => {
      const where = { status: query.status, severity: query.severity };
      const [data, total] = await Promise.all([
        tx.systemAlert.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.systemAlert.count({ where }),
      ]);
      return {
        data,
        pagination: this.pagination(query.page, query.limit, total),
      };
    });
  }

  acknowledgeAlert(
    id: string,
    dto: SystemAlertDecisionDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.decideAlert(id, AlertStatus.ACKNOWLEDGED, dto, actor, metadata);
  }

  resolveAlert(
    id: string,
    dto: SystemAlertDecisionDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.decideAlert(id, AlertStatus.RESOLVED, dto, actor, metadata);
  }

  async healthSnapshot() {
    const [dependencies, queue] = await Promise.all([
      this.health.dependencies(),
      this.database.transaction(async (tx) => ({
        pending: await tx.outboxEvent.count({
          where: { publishedAt: null, deadLetteredAt: null },
        }),
        deadLettered: await tx.outboxEvent.count({
          where: { deadLetteredAt: { not: null } },
        }),
      })),
    ]);
    const degraded = Object.values(dependencies).some(
      (dependency) => dependency.status === 'down',
    );
    return {
      status: degraded ? 'degraded' : 'healthy',
      checkedAt: new Date().toISOString(),
      services: {
        api: { status: 'up', latencyMs: 0 },
        ...dependencies,
        queue: {
          status: queue.deadLettered > 0 ? 'degraded' : 'up',
          ...queue,
        },
      },
    };
  }

  private decideAlert(
    id: string,
    status: AlertStatus,
    dto: SystemAlertDecisionDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.database.transaction(async (tx) => {
      const existing = await tx.systemAlert.findUnique({ where: { id } });
      if (!existing) this.notFound('SYSTEM_ALERT_NOT_FOUND', 'System alert');
      if (existing.status === AlertStatus.RESOLVED) {
        throw new ConflictException({
          code: 'SYSTEM_ALERT_ALREADY_RESOLVED',
          message: 'System alert is already resolved',
        });
      }
      if (
        status === AlertStatus.ACKNOWLEDGED &&
        existing.status !== AlertStatus.OPEN
      ) {
        throw new ConflictException({
          code: 'SYSTEM_ALERT_ALREADY_ACKNOWLEDGED',
          message: 'System alert is already acknowledged',
        });
      }
      const now = new Date();
      const updated = await tx.systemAlert.update({
        where: { id },
        data:
          status === AlertStatus.ACKNOWLEDGED
            ? {
                status,
                acknowledgedBy: actor.platformUserId,
                acknowledgedAt: now,
                acknowledgedNote: dto.note.trim(),
              }
            : {
                status,
                resolvedBy: actor.platformUserId,
                resolvedAt: now,
                resolvedNote: dto.note.trim(),
              },
      });
      await tx.systemAuditLog.create({
        data: {
          actorPlatformUserId: actor.platformUserId,
          tenantId: existing.tenantId,
          action: `platform.alert.${status.toLowerCase()}`,
          module: 'platform.operations',
          oldValue: this.json(existing),
          newValue: this.json(updated),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          requestId: metadata.requestId,
        },
      });
      return updated;
    });
  }

  private async enrichAudit(
    tx: PrismaTransaction,
    logs: Array<
      { actorPlatformUserId: string | null; tenantId: string | null } & Record<
        string,
        unknown
      >
    >,
  ) {
    const actorIds = [
      ...new Set(
        logs.flatMap((log) =>
          log.actorPlatformUserId ? [log.actorPlatformUserId] : [],
        ),
      ),
    ];
    const tenantIds = [
      ...new Set(logs.flatMap((log) => (log.tenantId ? [log.tenantId] : []))),
    ];
    const [actors, tenants] = await Promise.all([
      tx.platformUser.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, email: true },
      }),
      tx.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, companyName: true, subdomain: true },
      }),
    ]);
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
    const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant]));
    return logs.map((log) => ({
      ...log,
      actor: log.actorPlatformUserId
        ? (actorMap.get(log.actorPlatformUserId) ?? null)
        : null,
      tenant: log.tenantId ? (tenantMap.get(log.tenantId) ?? null) : null,
    }));
  }

  private pagination(page: number, limit: number, total: number) {
    return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  private notFound(code: string, entity: string): never {
    throw new NotFoundException({ code, message: `${entity} not found` });
  }

  private json(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}

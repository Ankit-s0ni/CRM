import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingPeriod,
  Prisma,
  SubscriptionStatus,
  TenantStatus,
  TokenPurpose,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
} from '../../../shared/authorization/permissions.constants';
import { OutboxService } from '../../../shared/events/outbox.service';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../platform-auth/platform-database.service';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import {
  CreatePlatformTenantDto,
  ListPlatformTenantsQueryDto,
  TenantLifecycleDto,
  UpdatePlatformTenantDto,
} from './dto/platform-tenant.dto';
import {
  isReservedSubdomain,
  isValidTimezone,
  normalizeWorkspaceInput,
  tenantLifecycleTarget,
} from '../platform-policy';
import { provisionTenantAttendanceDefaults } from '../../../shared/tenancy/provision-tenant-attendance-defaults';

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

const CURRENT_SUBSCRIPTIONS = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];
@Injectable()
export class PlatformTenantsService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly outbox: OutboxService,
  ) {}

  async list(query: ListPlatformTenantsQueryDto) {
    return this.database.transaction(async (tx) => {
      const filteredIds = await this.filteredTenantIds(tx, query);
      const search = query.search?.trim();
      const where: Prisma.TenantWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(filteredIds ? { id: { in: filteredIds } } : {}),
        ...(search
          ? {
              OR: [
                { companyName: { contains: search, mode: 'insensitive' } },
                { subdomain: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const total = await tx.tenant.count({ where });
      const tenants = await tx.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });
      const ids = tenants.map(({ id }) => id);
      const subscriptions = await tx.tenantSubscription.findMany({
        where: {
          tenantId: { in: ids },
          status: { in: CURRENT_SUBSCRIPTIONS },
        },
        include: { plan: true },
        orderBy: { updatedAt: 'desc' },
      });
      const employeeCounts = await tx.employee.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: ids } },
        _count: { _all: true },
      });
      const modules = await tx.tenantModule.findMany({
        where: { tenantId: { in: ids }, isActive: true },
        include: { module: true },
      });
      const subscriptionByTenant = new Map(
        subscriptions.map((subscription) => [
          subscription.tenantId,
          subscription,
        ]),
      );
      const countByTenant = new Map(
        employeeCounts.map((entry) => [entry.tenantId, entry._count._all]),
      );

      return {
        data: tenants.map((tenant) => {
          const subscription = subscriptionByTenant.get(tenant.id);
          return {
            id: tenant.id,
            companyName: tenant.companyName,
            subdomain: tenant.subdomain,
            status: tenant.status,
            createdAt: tenant.createdAt,
            employees: countByTenant.get(tenant.id) ?? 0,
            subscription: subscription
              ? {
                  status: subscription.status,
                  seatCount: subscription.seatCount,
                  plan: subscription.plan,
                }
              : null,
            modules: modules
              .filter(({ tenantId }) => tenantId === tenant.id)
              .map(({ module }) => ({ key: module.key, name: module.name })),
          };
        }),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  get(id: string) {
    return this.database.transaction((tx) => this.detail(tx, id));
  }

  listPlans() {
    return this.database.transaction(async (tx) => ({
      data: await tx.subscriptionPlan.findMany({ orderBy: { name: 'asc' } }),
    }));
  }

  async create(
    dto: CreatePlatformTenantDto,
    idempotencyKey: string,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    const normalized = {
      ...dto,
      ...normalizeWorkspaceInput(dto),
    };
    this.assertSubdomain(normalized.subdomain);
    this.assertTimezone(normalized.timezone);
    const requestHash = this.hash(JSON.stringify(normalized));
    const invitationToken = randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      const result = await this.database.transaction(async (tx) => {
        const replay = await tx.tenant.findUnique({
          where: { onboardingIdempotencyKey: idempotencyKey },
        });
        if (replay) {
          if (replay.onboardingRequestHash !== requestHash) {
            throw new ConflictException({
              code: 'IDEMPOTENCY_KEY_REUSED',
              message: 'Idempotency key was already used with another request',
            });
          }
          return { tenantId: replay.id, replayed: true };
        }

        const existingTenant = await tx.tenant.findFirst({
          where: {
            subdomain: { equals: normalized.subdomain, mode: 'insensitive' },
          },
        });
        if (existingTenant) {
          throw new ConflictException({
            code: 'TENANT_SUBDOMAIN_EXISTS',
            message: 'Workspace subdomain is already in use',
          });
        }
        const existingUser = await tx.user.findFirst({
          where: {
            email: { equals: normalized.adminEmail, mode: 'insensitive' },
          },
        });
        if (existingUser) {
          throw new ConflictException({
            code: 'TENANT_ADMIN_EMAIL_EXISTS',
            message: 'Administrator email is already in use',
          });
        }
        const pendingInvitation = await tx.verificationToken.findFirst({
          where: {
            email: { equals: normalized.adminEmail, mode: 'insensitive' },
            purpose: TokenPurpose.USER_INVITE,
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
        });
        if (pendingInvitation) {
          throw new ConflictException({
            code: 'TENANT_ADMIN_EMAIL_EXISTS',
            message: 'Administrator email already has a pending invitation',
          });
        }

        const plan = await tx.subscriptionPlan.findUnique({
          where: { id: normalized.planId },
        });
        if (!plan) this.notFound('Subscription plan');
        if (normalized.seatCount > plan.maxEmployees) {
          throw new BadRequestException({
            code: 'PLAN_SEAT_LIMIT_EXCEEDED',
            message: 'Seat count exceeds the selected plan limit',
          });
        }
        const modules = await tx.module.findMany({
          where: { key: { in: normalized.moduleKeys } },
        });
        if (modules.length !== normalized.moduleKeys.length) {
          throw new BadRequestException({
            code: 'MODULE_NOT_FOUND',
            message: 'One or more selected modules do not exist',
          });
        }

        const tenant = await tx.tenant.create({
          data: {
            companyName: normalized.companyName,
            subdomain: normalized.subdomain,
            status: TenantStatus.ACTIVE,
            onboardingIdempotencyKey: idempotencyKey,
            onboardingRequestHash: requestHash,
          },
        });
        await tx.tenantSettings.create({
          data: { tenantId: tenant.id, timezone: normalized.timezone },
        });
        await provisionTenantAttendanceDefaults(tx, tenant.id);
        const periodStart = new Date();
        const periodEnd = new Date(periodStart);
        if (plan.billingPeriod === BillingPeriod.YEARLY) {
          periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
        } else {
          periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
        }
        await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            seatCount: normalized.seatCount,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });
        const roles = await this.provisionRoles(tx, tenant.id);
        const adminRole = roles.get('BUSINESS_ADMIN');
        if (!adminRole) throw new Error('BUSINESS_ADMIN role missing');

        await tx.tenantModule.createMany({
          data: modules.map((module) => ({
            tenantId: tenant.id,
            moduleId: module.id,
            isActive: true,
            activatedAt: new Date(),
            activatedBy: actor.platformUserId,
          })),
        });
        await tx.verificationToken.create({
          data: {
            tenantId: tenant.id,
            email: normalized.adminEmail,
            purpose: TokenPurpose.USER_INVITE,
            tokenHash: this.hash(invitationToken),
            expiresAt: invitationExpiresAt,
            invitedBy: actor.platformUserId,
            payload: {
              tenantId: tenant.id,
              inviterId: actor.platformUserId,
              roleIds: [adminRole.id],
            },
          },
        });
        await this.outbox.append(tx, {
          tenantId: tenant.id,
          eventKey: 'platform.tenant.created',
          payload: {
            tenantId: tenant.id,
            adminEmail: normalized.adminEmail,
            moduleKeys: normalized.moduleKeys,
          },
        });
        await this.audit(
          tx,
          actor,
          metadata,
          'platform.tenant.created',
          null,
          {
            tenantId: tenant.id,
            companyName: tenant.companyName,
            subdomain: tenant.subdomain,
            adminEmail: normalized.adminEmail,
            planId: plan.id,
            moduleKeys: normalized.moduleKeys,
          },
          tenant.id,
        );
        return { tenantId: tenant.id, replayed: false };
      });

      const tenant = await this.get(result.tenantId);
      return {
        ...tenant,
        idempotencyReplayed: result.replayed,
        invitation: {
          email: normalized.adminEmail,
          expiresAt: result.replayed
            ? tenant.administratorInvitation?.expiresAt
            : invitationExpiresAt,
          debugInvitationToken:
            result.replayed || process.env.NODE_ENV === 'production'
              ? undefined
              : invitationToken,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'TENANT_SUBDOMAIN_EXISTS',
          message: 'Workspace subdomain or idempotency key is already in use',
        });
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdatePlatformTenantDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    if (dto.timezone) this.assertTimezone(dto.timezone);
    return this.database.transaction(async (tx) => {
      const existing = await tx.tenant.findUnique({
        where: { id },
        include: { settings: true },
      });
      if (!existing) this.notFound('Tenant');
      if (dto.companyName) {
        await tx.tenant.update({
          where: { id },
          data: { companyName: dto.companyName.trim() },
        });
      }
      if (dto.timezone) {
        await tx.tenantSettings.update({
          where: { tenantId: id },
          data: { timezone: dto.timezone.trim() },
        });
      }
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.tenant.updated',
        existing,
        {
          companyName: dto.companyName?.trim() ?? existing.companyName,
          timezone: dto.timezone?.trim() ?? existing.settings?.timezone,
        },
        id,
      );
      return this.detail(tx, id);
    });
  }

  async suspend(
    id: string,
    dto: TenantLifecycleDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.database.transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id } });
      if (!tenant) this.notFound('Tenant');
      if (!tenantLifecycleTarget(tenant.status, 'suspend'))
        return this.detail(tx, id);
      const users = await tx.user.findMany({
        where: { tenantId: id },
        select: { id: true },
      });
      const userIds = users.map(({ id: userId }) => userId);
      await tx.refreshToken.updateMany({
        where: { userId: { in: userIds }, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'ADMIN' },
      });
      const updated = await tx.tenant.update({
        where: { id },
        data: {
          status: TenantStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspendedReason: dto.reason.trim(),
          suspendedByPlatformUserId: actor.platformUserId,
        },
      });
      await this.outbox.append(tx, {
        tenantId: id,
        eventKey: 'platform.tenant.suspended',
        payload: { tenantId: id, reason: dto.reason.trim() },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.tenant.suspended',
        tenant,
        updated,
        id,
      );
      return this.detail(tx, id);
    });
  }

  async reactivate(
    id: string,
    dto: TenantLifecycleDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.database.transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id } });
      if (!tenant) this.notFound('Tenant');
      if (!tenantLifecycleTarget(tenant.status, 'reactivate'))
        return this.detail(tx, id);
      const updated = await tx.tenant.update({
        where: { id },
        data: {
          status: TenantStatus.ACTIVE,
          suspendedAt: null,
          suspendedReason: null,
          suspendedByPlatformUserId: null,
        },
      });
      await this.outbox.append(tx, {
        tenantId: id,
        eventKey: 'platform.tenant.reactivated',
        payload: { tenantId: id, reason: dto.reason.trim() },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.tenant.reactivated',
        tenant,
        {
          ...updated,
          reason: dto.reason.trim(),
        },
        id,
      );
      return this.detail(tx, id);
    });
  }

  billingSuspend(id: string, reason: string, requestId: string) {
    return this.billingLifecycle(id, 'suspend', reason, requestId);
  }

  billingReactivate(id: string, reason: string, requestId: string) {
    return this.billingLifecycle(id, 'reactivate', reason, requestId);
  }

  private billingLifecycle(
    id: string,
    action: 'suspend' | 'reactivate',
    reason: string,
    requestId: string,
  ) {
    return this.database.transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id } });
      if (!tenant) this.notFound('Tenant');
      if (!tenantLifecycleTarget(tenant.status, action)) {
        return { data: tenant, replayed: true };
      }
      const now = new Date();
      if (action === 'suspend') {
        const users = await tx.user.findMany({
          where: { tenantId: id },
          select: { id: true },
        });
        await tx.refreshToken.updateMany({
          where: {
            userId: { in: users.map(({ id: userId }) => userId) },
            revokedAt: null,
          },
          data: { revokedAt: now, revokedReason: 'ADMIN' },
        });
      }
      const updated = await tx.tenant.update({
        where: { id },
        data:
          action === 'suspend'
            ? {
                status: TenantStatus.SUSPENDED,
                suspendedAt: now,
                suspendedReason: reason,
                suspendedByPlatformUserId: null,
              }
            : {
                status: TenantStatus.ACTIVE,
                suspendedAt: null,
                suspendedReason: null,
                suspendedByPlatformUserId: null,
              },
      });
      await Promise.all([
        this.outbox.append(tx, {
          tenantId: id,
          eventKey: `platform.tenant.${action === 'suspend' ? 'suspended' : 'reactivated'}`,
          payload: { tenantId: id, reason, actor: 'billing-system' },
        }),
        tx.systemAuditLog.create({
          data: {
            tenantId: id,
            action: `platform.tenant.billing_${action === 'suspend' ? 'suspended' : 'reactivated'}`,
            module: 'platform.tenants',
            oldValue: this.json(tenant),
            newValue: this.json({
              ...updated,
              reason,
              actor: 'billing-system',
            }),
            requestId,
          },
        }),
        tx.tenantAuditLog.create({
          data: {
            tenantId: id,
            action: `billing.tenant.${action === 'suspend' ? 'suspended' : 'reactivated'}`,
            module: 'billing',
            oldValue: this.json({ status: tenant.status }),
            newValue: this.json({ status: updated.status, reason }),
            requestId,
          },
        }),
      ]);
      return { data: updated, replayed: false };
    });
  }

  private async detail(tx: PlatformTransaction, id: string) {
    const tenant = await tx.tenant.findUnique({
      where: { id },
      include: { settings: true },
    });
    if (!tenant) this.notFound('Tenant');
    const subscription = await tx.tenantSubscription.findFirst({
      where: { tenantId: id, status: { in: CURRENT_SUBSCRIPTIONS } },
      include: { plan: true },
      orderBy: { updatedAt: 'desc' },
    });
    const employees = await tx.employee.count({ where: { tenantId: id } });
    const modules = await tx.tenantModule.findMany({
      where: { tenantId: id },
      include: { module: true },
      orderBy: { module: { name: 'asc' } },
    });
    const invitation = await tx.verificationToken.findFirst({
      where: { tenantId: id, purpose: TokenPurpose.USER_INVITE },
      orderBy: { createdAt: 'desc' },
    });
    const primaryAdministrator = await tx.user.findFirst({
      where: {
        tenantId: id,
        roles: { some: { role: { name: 'BUSINESS_ADMIN' } } },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
      },
    });
    return {
      tenant,
      subscription,
      usage: {
        employees,
        seats: subscription?.seatCount ?? 0,
        percentage: subscription?.seatCount
          ? Math.round((employees / subscription.seatCount) * 100)
          : 0,
      },
      modules: modules.map((assignment) => ({
        key: assignment.module.key,
        name: assignment.module.name,
        isActive: assignment.isActive,
        activatedAt: assignment.activatedAt,
      })),
      administratorInvitation: invitation
        ? {
            email: invitation.email,
            expiresAt: invitation.expiresAt,
            consumedAt: invitation.consumedAt,
          }
        : null,
      primaryAdministrator,
    };
  }

  private async filteredTenantIds(
    tx: PlatformTransaction,
    query: ListPlatformTenantsQueryDto,
  ) {
    let ids: Set<string> | null = null;
    if (query.planId) {
      const subscriptions = await tx.tenantSubscription.findMany({
        where: { planId: query.planId, status: { in: CURRENT_SUBSCRIPTIONS } },
        select: { tenantId: true },
      });
      ids = new Set(subscriptions.map(({ tenantId }) => tenantId));
    }
    if (query.moduleKey) {
      const assignments = await tx.tenantModule.findMany({
        where: {
          isActive: true,
          module: { key: query.moduleKey.trim().toUpperCase() },
        },
        select: { tenantId: true },
      });
      const moduleIds = new Set(assignments.map(({ tenantId }) => tenantId));
      ids = ids
        ? new Set([...ids].filter((tenantId) => moduleIds.has(tenantId)))
        : moduleIds;
    }
    return ids ? [...ids] : null;
  }

  private async provisionRoles(tx: PlatformTransaction, tenantId: string) {
    await tx.permission.createMany({
      data: Object.values(PERMISSIONS).map((key) => ({ key })),
      skipDuplicates: true,
    });
    const permissions = await tx.permission.findMany({
      where: { key: { in: Object.values(PERMISSIONS) } },
    });
    const permissionIdByKey = new Map(
      permissions.map(({ id, key }) => [key, id]),
    );
    const roles = new Map<string, { id: string }>();
    for (const [name, assignedPermissions] of Object.entries(
      DEFAULT_ROLE_PERMISSIONS,
    )) {
      const role = await tx.role.create({
        data: { tenantId, name, isSystem: true },
      });
      roles.set(name, role);
      await tx.rolePermission.createMany({
        data: assignedPermissions.map((permissionKey) => ({
          roleId: role.id,
          permissionId: permissionIdByKey.get(permissionKey)!,
        })),
      });
    }
    return roles;
  }

  private audit(
    tx: PlatformTransaction,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
    action: string,
    oldValue: unknown,
    newValue: unknown,
    tenantId?: string,
  ) {
    return tx.systemAuditLog.create({
      data: {
        actorPlatformUserId: actor.platformUserId,
        tenantId,
        action,
        module: 'platform.tenants',
        oldValue: this.json(oldValue),
        newValue: this.json(newValue),
        ipAddress: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
        requestId: metadata.requestId ?? null,
      },
    });
  }

  private json(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private assertSubdomain(subdomain: string) {
    if (isReservedSubdomain(subdomain)) {
      throw new BadRequestException({
        code: 'TENANT_SUBDOMAIN_RESERVED',
        message: 'Workspace subdomain is reserved',
      });
    }
  }

  private assertTimezone(timezone: string) {
    if (!isValidTimezone(timezone)) {
      throw new BadRequestException({
        code: 'TIMEZONE_INVALID',
        message: 'Timezone must be a valid IANA timezone',
      });
    }
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private notFound(resource: string): never {
    throw new NotFoundException({
      code: `${resource.toUpperCase().replaceAll(' ', '_')}_NOT_FOUND`,
      message: `${resource} was not found`,
    });
  }
}

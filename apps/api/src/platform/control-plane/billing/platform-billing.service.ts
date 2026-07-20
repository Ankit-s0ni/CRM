import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentMethodStatus,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  DunningService,
  majorToMinor,
  minorToMajor,
  PaymentProviderRegistry,
} from '../../billing/public';
import { OutboxService } from '../../../shared/events/outbox.service';
import { bumpRuntimeConfigVersion } from '../../../shared/runtime-config/runtime-config-version';
import { moduleAssignmentViolation } from '../platform-policy';
import {
  CatalogSelectionError,
  resolveCatalogSelection,
} from '../catalog-policy';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../platform-auth/platform-database.service';
import {
  CreatePlatformPlanDto,
  DunningRetryDto,
  PlatformBillingQueryDto,
  UpdatePlatformPlanDto,
} from './dto/platform-billing.dto';

const CURRENT: SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.SUSPENDED,
];
const FRESH_MFA_MS = 5 * 60_000;

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class PlatformBillingService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly providers: PaymentProviderRegistry,
    private readonly dunning: DunningService,
    private readonly outbox: OutboxService,
  ) {}

  plans() {
    return this.database.transaction(async (tx) => ({
      data: await tx.subscriptionPlan.findMany({
        include: {
          modules: { include: { module: true } },
          capabilities: { include: { capability: true } },
          _count: { select: { subscriptions: true } },
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
    }));
  }

  createPlan(
    dto: CreatePlatformPlanDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    return this.database
      .transaction(async (tx) => {
        const bundle = await this.validatedEntitlements(
          tx,
          dto.moduleKeys,
          dto.capabilityKeys ?? [],
        );
        const price = minorToMajor(
          majorToMinor(dto.pricePerUser, dto.currency),
          dto.currency,
        );
        const plan = await tx.subscriptionPlan.create({
          data: {
            name: dto.name.trim(),
            description: dto.description?.trim(),
            pricePerUser: price,
            currency: dto.currency,
            maxEmployees: dto.maxEmployees,
            billingPeriod: dto.billingPeriod,
            modules: {
              create: bundle.modules.map((module) => ({ moduleId: module.id })),
            },
            capabilities: {
              create: bundle.capabilities.map((capability) => ({
                capabilityId: capability.id,
              })),
            },
          },
          include: {
            modules: { include: { module: true } },
            capabilities: { include: { capability: true } },
          },
        });
        await this.audit(
          tx,
          actor,
          metadata,
          'platform.plan.created',
          null,
          plan,
        );
        return { data: plan };
      })
      .catch((error: unknown) => this.planConflict(error));
  }

  updatePlan(
    id: string,
    dto: UpdatePlatformPlanDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    return this.database
      .transaction(async (tx) => {
        const current = await tx.subscriptionPlan.findUnique({
          where: { id },
          include: {
            modules: { include: { module: true } },
            capabilities: { include: { capability: true } },
          },
        });
        if (!current) this.notFound('PLAN_NOT_FOUND', 'Subscription plan');
        const bundle =
          dto.moduleKeys || dto.capabilityKeys
            ? await this.validatedEntitlements(
                tx,
                dto.moduleKeys ??
                  current.modules.map(({ module }) => module.key),
                dto.capabilityKeys ??
                  current.capabilities.map(({ capability }) => capability.key),
              )
            : {
                modules: current.modules.map(({ module }) => module),
                capabilities: current.capabilities.map(
                  ({ capability }) => capability,
                ),
              };
        const removedCapabilityKeys = current.capabilities
          .map(({ capability }) => capability.key)
          .filter(
            (key) =>
              !bundle.capabilities.some((capability) => capability.key === key),
          );
        if (removedCapabilityKeys.length && !dto.impactAcknowledged) {
          const affectedSubscriptions = await tx.tenantSubscription.count({
            where: { planId: id, status: { in: CURRENT } },
          });
          if (affectedSubscriptions > 0) {
            throw new ConflictException({
              code: 'PLAN_CHANGE_IMPACT_REQUIRED',
              message:
                'Review and acknowledge the affected tenants before removing plan features',
            });
          }
        }
        if (
          dto.maxEmployees !== undefined &&
          dto.maxEmployees < current.maxEmployees
        ) {
          const unsafe = await tx.tenantSubscription.findFirst({
            where: {
              planId: id,
              status: { in: CURRENT },
              seatCount: { gt: dto.maxEmployees },
            },
          });
          if (unsafe) {
            throw new ConflictException({
              code: 'PLAN_IN_USE',
              message: 'An active subscription exceeds the new employee limit',
            });
          }
        }
        const price = dto.pricePerUser
          ? minorToMajor(
              majorToMinor(dto.pricePerUser, current.currency),
              current.currency,
            )
          : undefined;
        const updated = await tx.subscriptionPlan.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            description: dto.description?.trim(),
            pricePerUser: price,
            maxEmployees: dto.maxEmployees,
            billingPeriod: dto.billingPeriod,
            isActive: dto.isActive,
          },
        });
        if (dto.moduleKeys || dto.capabilityKeys) {
          await tx.subscriptionPlanModule.deleteMany({ where: { planId: id } });
          await tx.subscriptionPlanModule.createMany({
            data: bundle.modules.map((module) => ({
              planId: id,
              moduleId: module.id,
            })),
          });
          await tx.subscriptionPlanCapability.deleteMany({
            where: { planId: id },
          });
          await tx.subscriptionPlanCapability.createMany({
            data: bundle.capabilities.map((capability) => ({
              planId: id,
              capabilityId: capability.id,
            })),
          });
          await this.propagateBundle(
            tx,
            id,
            bundle.modules,
            bundle.capabilities,
            actor.platformUserId,
          );
        }
        const result = await tx.subscriptionPlan.findUniqueOrThrow({
          where: { id },
          include: {
            modules: { include: { module: true } },
            capabilities: { include: { capability: true } },
          },
        });
        await this.audit(
          tx,
          actor,
          metadata,
          'platform.plan.updated',
          current,
          result,
        );
        return { data: { ...result, updatedAt: updated.updatedAt } };
      })
      .catch((error: unknown) => this.planConflict(error));
  }

  planImpact(id: string, dto: UpdatePlatformPlanDto) {
    return this.database.transaction(async (tx) => {
      const current = await tx.subscriptionPlan.findUnique({
        where: { id },
        include: {
          modules: { include: { module: true } },
          capabilities: { include: { capability: true } },
        },
      });
      if (!current) this.notFound('PLAN_NOT_FOUND', 'Subscription plan');
      const bundle = await this.validatedEntitlements(
        tx,
        dto.moduleKeys ?? current.modules.map(({ module }) => module.key),
        dto.capabilityKeys ??
          current.capabilities.map(({ capability }) => capability.key),
      );
      const subscriptions = await tx.tenantSubscription.findMany({
        where: { planId: id, status: { in: CURRENT } },
        select: {
          seatCount: true,
          tenant: { select: { id: true, companyName: true, subdomain: true } },
        },
        orderBy: { tenant: { companyName: 'asc' } },
      });
      const currentModules = new Set(
        current.modules.map(({ module }) => module.key),
      );
      const currentCapabilities = new Set(
        current.capabilities.map(({ capability }) => capability.key),
      );
      const nextModules = new Set(bundle.modules.map(({ key }) => key));
      const nextCapabilities = new Set(
        bundle.capabilities.map(({ key }) => key),
      );
      const employeeLimit = dto.maxEmployees ?? current.maxEmployees;
      return {
        data: {
          affectedTenantCount: subscriptions.length,
          affectedTenants: subscriptions
            .slice(0, 10)
            .map(({ tenant }) => tenant),
          addedModuleKeys: [...nextModules].filter(
            (key) => !currentModules.has(key),
          ),
          removedModuleKeys: [...currentModules].filter(
            (key) => !nextModules.has(key),
          ),
          addedCapabilityKeys: [...nextCapabilities].filter(
            (key) => !currentCapabilities.has(key),
          ),
          removedCapabilityKeys: [...currentCapabilities].filter(
            (key) => !nextCapabilities.has(key),
          ),
          tenantsOverEmployeeLimit: subscriptions.filter(
            ({ seatCount }) => seatCount > employeeLimit,
          ).length,
          autoIncludedCapabilityKeys: bundle.autoIncludedCapabilityKeys,
        },
      };
    });
  }

  invoices(query: PlatformBillingQueryDto) {
    return this.database.transaction(async (tx) => {
      const where: Prisma.TenantInvoiceWhereInput = {
        status: query.status
          ? (query.status.toUpperCase() as InvoiceStatus)
          : undefined,
        OR: query.search
          ? [
              {
                invoiceNumber: { contains: query.search, mode: 'insensitive' },
              },
              {
                tenant: {
                  companyName: { contains: query.search, mode: 'insensitive' },
                },
              },
            ]
          : undefined,
      };
      const [data, total] = await Promise.all([
        tx.tenantInvoice.findMany({
          where,
          include: {
            tenant: {
              select: { id: true, companyName: true, subdomain: true },
            },
            subscription: { include: { plan: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.tenantInvoice.count({ where }),
      ]);
      return { data: serialize(data), pagination: pagination(query, total) };
    });
  }

  invoice(id: string) {
    return this.database.transaction(async (tx) => {
      const invoice = await tx.tenantInvoice.findUnique({
        where: { id },
        include: {
          tenant: true,
          subscription: { include: { plan: true } },
          lineItems: true,
          transactions: { orderBy: { attemptedAt: 'desc' } },
        },
      });
      if (!invoice) this.notFound('INVOICE_NOT_FOUND', 'Invoice');
      return { data: serialize(invoice) };
    });
  }

  transactions(query: PlatformBillingQueryDto) {
    return this.database.transaction(async (tx) => {
      const where: Prisma.PaymentTransactionWhereInput = {
        status: query.status
          ? (query.status.toUpperCase() as PaymentStatus)
          : undefined,
        gateway: query.provider,
      };
      const [data, total] = await Promise.all([
        tx.paymentTransaction.findMany({
          where,
          include: {
            invoice: {
              include: {
                tenant: {
                  select: { id: true, companyName: true, subdomain: true },
                },
              },
            },
          },
          orderBy: { attemptedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.paymentTransaction.count({ where }),
      ]);
      return { data: serialize(data), pagination: pagination(query, total) };
    });
  }

  dunningQueue(query: PlatformBillingQueryDto) {
    return this.database.transaction(async (tx) => {
      const where: Prisma.TenantSubscriptionWhereInput = {
        dunningState: { not: 'NONE' },
      };
      const [data, total] = await Promise.all([
        tx.tenantSubscription.findMany({
          where,
          include: {
            tenant: true,
            plan: true,
            dunningHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
            invoices: { orderBy: { createdAt: 'desc' }, take: 3 },
          },
          orderBy: { updatedAt: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.tenantSubscription.count({ where }),
      ]);
      return { data: serialize(data), pagination: pagination(query, total) };
    });
  }

  async retry(
    subscriptionId: string,
    dto: DunningRetryDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    const prepared = await this.database.transaction(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { id: subscriptionId },
        include: {
          invoices: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!subscription)
        this.notFound('SUBSCRIPTION_NOT_FOUND', 'Subscription');
      const invoice = dto.invoiceId
        ? subscription.invoices.find(({ id }) => id === dto.invoiceId)
        : subscription.invoices.find(
            ({ status }) => status === InvoiceStatus.OPEN,
          );
      if (!invoice || invoice.status !== InvoiceStatus.OPEN) {
        throw new ConflictException({
          code: 'INVOICE_NOT_PAYABLE',
          message: 'No payable invoice is available for this subscription',
        });
      }
      const method = await tx.billingPaymentMethod.findFirst({
        where: {
          tenantId: subscription.tenantId,
          status: PaymentMethodStatus.ACTIVE,
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      if (!method) {
        throw new UnprocessableEntityException({
          code: 'PAYMENT_METHOD_REQUIRED',
          message: 'Tenant has no active payment method',
        });
      }
      return { subscription, invoice, method };
    });
    const idempotencyKey = `manual-retry:${prepared.invoice.id}:${randomUUID()}`;
    const charge = await this.providers.get(prepared.method.gateway).charge({
      amountMinor: majorToMinor(
        prepared.invoice.amountDue.toString(),
        prepared.invoice.currency,
      ),
      currency: prepared.invoice.currency,
      providerMethodRef: prepared.method.providerMethodRef,
      invoiceId: prepared.invoice.id,
      idempotencyKey,
    });
    const transaction = await this.database.transaction(async (tx) => {
      const payment = await tx.paymentTransaction.create({
        data: {
          tenantId: prepared.subscription.tenantId,
          invoiceId: prepared.invoice.id,
          gateway: prepared.method.gateway,
          gatewayRef: charge.gatewayRef,
          amount: prepared.invoice.amountDue,
          currency: prepared.invoice.currency,
          status: charge.status,
          failureReason: charge.failureReason,
          idempotencyKey,
          metadata: {
            reason: dto.reason,
            actorPlatformUserId: actor.platformUserId,
          },
        },
      });
      if (charge.status === PaymentStatus.SUCCEEDED) {
        await tx.tenantInvoice.update({
          where: { id: prepared.invoice.id },
          data: {
            status: InvoiceStatus.PAID,
            amountDue: 0,
            paidAt: new Date(),
          },
        });
      }
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.billing.payment_retried',
        null,
        {
          subscriptionId,
          invoiceId: prepared.invoice.id,
          transactionId: payment.id,
          status: charge.status,
          reason: dto.reason,
        },
        prepared.subscription.tenantId,
      );
      return payment;
    });
    if (charge.status === PaymentStatus.SUCCEEDED) {
      await this.dunning.paymentRecovered(
        prepared.invoice.id,
        idempotencyKey,
        dto.reason,
      );
    } else {
      await this.dunning.paymentFailed(
        prepared.invoice.id,
        idempotencyKey,
        charge.failureReason ?? dto.reason,
      );
    }
    return { data: serialize(transaction) };
  }

  billingDashboard() {
    return this.database.transaction(async (tx) => {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const [subscriptions, payments, outstanding, failed, recent] =
        await Promise.all([
          tx.tenantSubscription.findMany({
            where: {
              status: {
                in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
              },
            },
            include: { plan: true },
          }),
          tx.paymentTransaction.findMany({
            where: {
              status: PaymentStatus.SUCCEEDED,
              attemptedAt: { gte: monthStart },
            },
          }),
          tx.tenantInvoice.aggregate({
            where: { status: InvoiceStatus.OPEN },
            _sum: { amountDue: true },
          }),
          tx.paymentTransaction.count({
            where: {
              status: PaymentStatus.FAILED,
              attemptedAt: { gte: monthStart },
            },
          }),
          tx.tenantSubscription.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { tenant: true, plan: true },
          }),
        ]);
      const revenueByCurrency = new Map<
        string,
        { mrrMinor: bigint; collectedMinor: bigint }
      >();
      for (const subscription of subscriptions) {
        const entry = revenueByCurrency.get(subscription.plan.currency) ?? {
          mrrMinor: 0n,
          collectedMinor: 0n,
        };
        const planMinor = majorToMinor(
          subscription.plan.pricePerUser.toString(),
          subscription.plan.currency,
        );
        entry.mrrMinor +=
          (planMinor * BigInt(subscription.seatCount)) /
          BigInt(subscription.plan.billingPeriod === 'YEARLY' ? 12 : 1);
        revenueByCurrency.set(subscription.plan.currency, entry);
      }
      for (const payment of payments) {
        const entry = revenueByCurrency.get(payment.currency) ?? {
          mrrMinor: 0n,
          collectedMinor: 0n,
        };
        entry.collectedMinor += majorToMinor(
          payment.amount.toString(),
          payment.currency,
        );
        revenueByCurrency.set(payment.currency, entry);
      }
      return {
        data: {
          revenueByCurrency: [...revenueByCurrency].map(
            ([currency, values]) => ({
              currency,
              mrr: minorToMajor(values.mrrMinor, currency),
              collectedThisMonth: minorToMajor(values.collectedMinor, currency),
            }),
          ),
          outstanding: outstanding._sum.amountDue?.toString() ?? '0.00',
          failedPaymentsThisMonth: failed,
          recentSubscriptions: serialize(recent),
        },
      };
    });
  }

  async providerHealth() {
    const [providers, webhook] = await Promise.all([
      this.providers.health(),
      this.database.transaction(async (tx) => {
        const [latest, failed, pending] = await Promise.all([
          tx.billingWebhookReceipt.findFirst({
            orderBy: { createdAt: 'desc' },
          }),
          tx.billingWebhookReceipt.count({ where: { status: 'FAILED' } }),
          tx.billingWebhookReceipt.count({
            where: { status: { in: ['RECEIVED', 'PROCESSING'] } },
          }),
        ]);
        return {
          latestReceivedAt: latest?.createdAt ?? null,
          lagSeconds: latest
            ? Math.max(
                0,
                Math.round((Date.now() - latest.createdAt.getTime()) / 1000),
              )
            : null,
          failed,
          pending,
        };
      }),
    ]);
    return {
      data: { providers, webhook, checkedAt: new Date().toISOString() },
    };
  }

  private async validatedModules(tx: PlatformTransaction, keys: string[]) {
    const normalized = [
      ...new Set(keys.map((key) => key.toUpperCase())),
    ].sort();
    const modules = await tx.module.findMany({
      where: { key: { in: normalized } },
    });
    if (modules.length !== normalized.length) {
      throw new UnprocessableEntityException({
        code: 'MODULE_NOT_FOUND',
        message: 'One or more plan modules do not exist',
      });
    }
    const violation = moduleAssignmentViolation(modules, normalized);
    if (violation) {
      throw new UnprocessableEntityException({
        code: 'MODULE_ASSIGNMENT_INVALID',
        message: violation,
      });
    }
    return modules;
  }

  private async validatedEntitlements(
    tx: PlatformTransaction,
    moduleKeys: string[],
    capabilityKeys: string[],
  ) {
    const [modules, capabilities] = await Promise.all([
      tx.module.findMany(),
      tx.moduleCapability.findMany(),
    ]);
    try {
      const selection = resolveCatalogSelection({
        modules,
        capabilities,
        requestedModuleKeys: moduleKeys,
        requestedCapabilityKeys: capabilityKeys,
      });
      return {
        modules: modules.filter((module) =>
          selection.moduleKeys.includes(module.key),
        ),
        capabilities: capabilities.filter((capability) =>
          selection.capabilityKeys.includes(capability.key),
        ),
        autoIncludedCapabilityKeys: selection.autoIncludedCapabilityKeys,
      };
    } catch (error) {
      if (error instanceof CatalogSelectionError) {
        throw new UnprocessableEntityException({
          code: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  }

  private async propagateBundle(
    tx: PlatformTransaction,
    planId: string,
    modules: Array<{ id: string; key: string }>,
    capabilities: Array<{ id: string; key: string }>,
    actorId: string,
  ) {
    const subscriptions = await tx.tenantSubscription.findMany({
      where: { planId, status: { in: CURRENT } },
      select: { tenantId: true },
    });
    const now = new Date();
    for (const { tenantId } of subscriptions) {
      await tx.tenantModule.updateMany({
        where: { tenantId, isActive: true },
        data: { isActive: false },
      });
      for (const module of modules) {
        await tx.tenantModule.upsert({
          where: { tenantId_moduleId: { tenantId, moduleId: module.id } },
          update: { isActive: true, activatedAt: now, activatedBy: actorId },
          create: {
            tenantId,
            moduleId: module.id,
            isActive: true,
            activatedAt: now,
            activatedBy: actorId,
          },
        });
      }
      await Promise.all([
        bumpRuntimeConfigVersion(tx, tenantId),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'billing.plan.bundle_changed',
          payload: {
            tenantId,
            planId,
            moduleKeys: modules.map(({ key }) => key),
            capabilityKeys: capabilities.map(({ key }) => key),
          },
        }),
      ]);
    }
  }

  private assertFreshMfa(actor: AuthenticatedPlatformUser) {
    const verifiedAt = new Date(actor.mfaVerifiedAt).getTime();
    if (
      !Number.isFinite(verifiedAt) ||
      Date.now() - verifiedAt > FRESH_MFA_MS
    ) {
      throw new UnauthorizedException({
        code: 'MFA_REQUIRED',
        message: 'Fresh MFA verification is required for this billing action',
      });
    }
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
        module: 'platform.billing',
        oldValue: json(oldValue),
        newValue: json(newValue),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        requestId: metadata.requestId,
      },
    });
  }

  private planConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'PLAN_NAME_EXISTS',
        message: 'A subscription plan already uses this name',
      });
    }
    throw error;
  }

  private notFound(code: string, resource: string): never {
    throw new NotFoundException({ code, message: `${resource} was not found` });
  }
}

function pagination(query: { page: number; limit: number }, total: number) {
  return {
    page: query.page,
    limit: query.limit,
    total,
    pages: Math.ceil(total / query.limit),
  };
}

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      Prisma.Decimal.isDecimal(item) ? item.toString() : item,
    ),
  ) as T;
}

function json(value: unknown) {
  if (value === undefined) return undefined;
  return serialize(value) as Prisma.InputJsonValue;
}

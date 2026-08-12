import { Injectable, NotFoundException } from '@nestjs/common';
import type { EffectiveEntitlements } from '@mariya-abdul/deltcrm-product-contracts';
import { randomUUID } from 'node:crypto';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../../shared/database/platform-database.service';

type ResolvedProduct = EffectiveEntitlements['products'][number] & {
  productId: string;
  previous?: {
    active: boolean;
    capabilities: unknown;
    limits: unknown;
    projectionVersion: number;
  };
  provisioning?: { state: string };
  source: Record<string, string | null>;
};

@Injectable()
export class ProductEntitlementService {
  constructor(private readonly database: PlatformDatabaseService) {}

  resolve(tenantId: string): Promise<EffectiveEntitlements> {
    return this.database.transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: { settings: true },
      });
      if (!tenant) {
        throw new NotFoundException({
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant does not exist',
        });
      }

      const now = new Date();
      const [
        subscription,
        products,
        productOverrides,
        capabilityOverrides,
        limitOverrides,
      ] = await Promise.all([
        tx.tenantSubscription.findFirst({
          where: { tenantId },
          include: {
            plan: {
              include: {
                productGrants: true,
                productCapabilityGrants: { include: { capability: true } },
                productLimitGrants: { include: { limit: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        tx.registeredProduct.findMany({
          where: { status: { in: ['ACTIVE', 'SUSPENDED'] } },
          include: {
            capabilities: true,
            effectiveEntitlements: { where: { tenantId } },
            provisioning: { where: { tenantId } },
          },
          orderBy: { productKey: 'asc' },
        }),
        tx.tenantProductOverride.findMany({ where: { tenantId } }),
        tx.tenantProductCapabilityOverride.findMany({
          where: { tenantId },
          include: { capability: true },
        }),
        tx.tenantProductLimitOverride.findMany({
          where: { tenantId },
          include: { limit: true },
        }),
      ]);

      const graceDays = Math.max(
        0,
        Number(process.env.PRODUCT_PAST_DUE_GRACE_DAYS ?? 7),
      );
      const pastDueGraceEndsAt = subscription
        ? new Date(
            subscription.currentPeriodEnd.getTime() + graceDays * 86_400_000,
          )
        : null;
      const subscriptionAllowsAccess =
        !!subscription &&
        (['TRIALING', 'ACTIVE'].includes(subscription.status) ||
          (subscription.status === 'PAST_DUE' &&
            !!pastDueGraceEndsAt &&
            now <= pastDueGraceEndsAt));
      const tenantAllowsAccess = ['TRIAL', 'ACTIVE'].includes(tenant.status);
      const grantedProductIds = new Set(
        subscription?.plan.productGrants
          .filter(({ included }) => included)
          .map(({ productId }) => productId) ?? [],
      );
      const resolved: ResolvedProduct[] = [];

      for (const product of products) {
        const productOverride = productOverrides.find(
          (override) =>
            override.productId === product.id && this.current(override, now),
        );
        let active =
          tenantAllowsAccess &&
          subscriptionAllowsAccess &&
          product.status === 'ACTIVE' &&
          grantedProductIds.has(product.id);
        if (productOverride?.mode === 'ENABLE')
          active = tenantAllowsAccess && product.status === 'ACTIVE';
        if (productOverride?.mode === 'DISABLE') active = false;

        const grantedCapabilities = new Set(
          subscription?.plan.productCapabilityGrants
            .filter((grant) => grant.productId === product.id && grant.included)
            .map(({ capability }) => capability.key) ?? [],
        );
        if (active) {
          for (const capability of product.capabilities) {
            if (capability.required) grantedCapabilities.add(capability.key);
          }
        }
        for (const override of capabilityOverrides) {
          if (override.productId !== product.id || !this.current(override, now))
            continue;
          if (override.mode === 'ENABLE')
            grantedCapabilities.add(override.capability.key);
          if (override.mode === 'DISABLE')
            grantedCapabilities.delete(override.capability.key);
        }
        this.closeDependencies(product.capabilities, grantedCapabilities);
        const capabilities = Object.fromEntries(
          product.capabilities.map((capability) => [
            capability.key,
            active && grantedCapabilities.has(capability.key),
          ]),
        );
        const limits: Record<string, number> = Object.fromEntries(
          (subscription?.plan.productLimitGrants ?? [])
            .filter((grant) => grant.productId === product.id)
            .map((grant) => [grant.limit.key, Number(grant.value)]),
        );
        for (const override of limitOverrides) {
          if (
            override.productId === product.id &&
            this.current(override, now)
          ) {
            limits[override.limit.key] = Number(override.value);
          }
        }
        resolved.push({
          productId: product.id,
          key: product.productKey,
          active,
          capabilities,
          limits,
          previous: product.effectiveEntitlements[0],
          provisioning: product.provisioning[0],
          source: {
            subscriptionId: subscription?.id ?? null,
            planId: subscription?.planId ?? null,
            productOverrideId: productOverride?.id ?? null,
          },
        });
      }

      const changed = resolved.filter((item) => this.changed(item));
      const baseVersion = tenant.settings?.runtimeConfigVersion ?? 1;
      const version = changed.length ? baseVersion + 1 : baseVersion;
      if (changed.length) {
        await tx.tenantSettings.upsert({
          where: { tenantId },
          update: { runtimeConfigVersion: version },
          create: { tenantId, runtimeConfigVersion: version },
        });
        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventKey: 'platform.entitlements.changed.v1',
            payload: {
              eventId: randomUUID(),
              eventType: 'platform.entitlements.changed.v1',
              occurredAt: now.toISOString(),
              producer: 'PLATFORM',
              tenantId,
              correlationId: randomUUID(),
              schemaVersion: 1,
              payload: {
                entitlementVersion: version,
                productKeys: changed.map(({ key }) => key),
              },
            },
          },
        });
      }

      for (const item of resolved) {
        if (
          item.previous?.active !== item.active &&
          (item.previous || item.active)
        ) {
          await this.enqueueLifecycle(tx, tenantId, item, version, now);
        }
        await tx.effectiveTenantProductEntitlement.upsert({
          where: {
            tenantId_productId: { tenantId, productId: item.productId },
          },
          update: {
            active: item.active,
            capabilities: item.capabilities,
            limits: item.limits,
            source: item.source,
            entitlementVersion: version,
            effectiveAt: now,
            projectionVersion: { increment: 1 },
          },
          create: {
            tenantId,
            productId: item.productId,
            active: item.active,
            capabilities: item.capabilities,
            limits: item.limits,
            source: item.source,
            entitlementVersion: version,
            effectiveAt: now,
          },
        });
      }

      return {
        tenantId,
        subscriptionStatus:
          tenant.status === 'SUSPENDED'
            ? 'SUSPENDED'
            : subscription?.status === 'CANCELLED'
              ? 'CANCELED'
              : (subscription?.status ?? 'NONE'),
        products: resolved.map(({ key, active, capabilities, limits }) => ({
          key,
          active,
          capabilities,
          limits,
        })),
        version,
        effectiveAt: now.toISOString(),
      };
    });
  }

  private async enqueueLifecycle(
    tx: PlatformTransaction,
    tenantId: string,
    item: ResolvedProduct,
    version: number,
    now: Date,
  ) {
    const eventType = item.active
      ? item.provisioning?.state === 'SUSPENDED'
        ? 'platform.product.reactivation-requested.v1'
        : 'platform.product.activation-requested.v1'
      : 'platform.product.suspension-requested.v1';
    const eventId = randomUUID();
    const correlationId = randomUUID();
    const idempotencyKey = `${tenantId}:${item.productId}:${version}:${eventType}`;
    const envelope = {
      eventId,
      eventType,
      occurredAt: now.toISOString(),
      producer: 'PLATFORM',
      tenantId,
      correlationId,
      schemaVersion: 1,
      payload: {
        productKey: item.key,
        entitlementVersion: version,
        requestedBy: 'platform.entitlement-resolver',
      },
    };
    await tx.outboxEvent.create({
      data: { tenantId, eventKey: eventType, payload: envelope },
    });
    await tx.productLifecycleDelivery.create({
      data: {
        tenantId,
        productId: item.productId,
        eventId,
        eventKey: eventType,
        idempotencyKey,
        correlationId,
      },
    });
    await tx.productProvisioningInstance.upsert({
      where: { tenantId_productId: { tenantId, productId: item.productId } },
      update: {
        state: item.active ? 'PENDING' : 'SUSPENDED',
        attempt: { increment: 1 },
        failureCode: null,
        lastEventId: eventId,
        version: { increment: 1 },
      },
      create: {
        tenantId,
        productId: item.productId,
        state: item.active ? 'PENDING' : 'SUSPENDED',
        attempt: 1,
        lastEventId: eventId,
      },
    });
  }

  private changed(item: ResolvedProduct) {
    if (!item.previous) return item.active;
    return (
      item.previous.active !== item.active ||
      stableJson(item.previous.capabilities) !==
        stableJson(item.capabilities) ||
      stableJson(item.previous.limits) !== stableJson(item.limits)
    );
  }

  private current(
    override: { startsAt: Date | null; endsAt: Date | null },
    now: Date,
  ) {
    return (
      (!override.startsAt || override.startsAt <= now) &&
      (!override.endsAt || override.endsAt > now)
    );
  }

  private closeDependencies(
    capabilities: Array<{
      key: string;
      dependencyKeys: string[];
      conflictKeys: string[];
    }>,
    granted: Set<string>,
  ) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const capability of capabilities) {
        if (!granted.has(capability.key)) continue;
        for (const dependency of capability.dependencyKeys) {
          if (!granted.has(dependency)) {
            granted.add(dependency);
            changed = true;
          }
        }
      }
    }
    for (const capability of capabilities) {
      if (!granted.has(capability.key)) continue;
      for (const conflict of capability.conflictKeys) granted.delete(conflict);
    }
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

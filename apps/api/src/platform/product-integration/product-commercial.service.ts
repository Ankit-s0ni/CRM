import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../../shared/database/platform-database.service';
import { Prisma } from '../../generated/platform-client';
import type { AuthenticatedPlatformUser } from '../control-plane/public';
import type {
  ConfigurePlanProductDto,
  TenantCapabilityOverrideDto,
  TenantLimitOverrideDto,
  TenantProductOverrideDto,
} from './dto/product-registration.dto';
import { ProductEntitlementService } from './product-entitlement.service';
import type { ProductRequestMetadata } from './product-registry.service';
import { ProductRegistryService } from './product-registry.service';

const MFA_FRESH_MS = 10 * 60_000;

@Injectable()
export class ProductCommercialService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly registry: ProductRegistryService,
    private readonly entitlements: ProductEntitlementService,
  ) {}

  tenantEntitlements(tenantId: string) {
    return this.entitlements.resolve(tenantId);
  }

  async configurePlan(
    planId: string,
    productKey: string,
    dto: ConfigurePlanProductDto,
    actor: AuthenticatedPlatformUser,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    this.assertIdempotencyKey(metadata);
    const product = await this.registry.active(productKey);
    const tenantIds = await this.database.transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.findUnique({
        where: { id: planId },
      });
      if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND' });
      const capabilities = await tx.productCapabilityDefinition.findMany({
        where: {
          productId: product.id,
          key: {
            in: dto.capabilities.map(({ capabilityKey }) => capabilityKey),
          },
        },
      });
      const limits = await tx.productLimitDefinition.findMany({
        where: {
          productId: product.id,
          key: { in: dto.limits.map(({ limitKey }) => limitKey) },
        },
      });
      if (
        capabilities.length !==
        new Set(dto.capabilities.map(({ capabilityKey }) => capabilityKey)).size
      ) {
        throw new UnprocessableEntityException({
          code: 'UNKNOWN_PRODUCT_CAPABILITY',
        });
      }
      if (
        limits.length !==
        new Set(dto.limits.map(({ limitKey }) => limitKey)).size
      ) {
        throw new UnprocessableEntityException({
          code: 'UNKNOWN_PRODUCT_LIMIT',
        });
      }
      await tx.planProductGrant.upsert({
        where: { planId_productId: { planId, productId: product.id } },
        update: { included: dto.included },
        create: { planId, productId: product.id, included: dto.included },
      });
      await tx.planProductCapabilityGrant.deleteMany({
        where: { planId, productId: product.id },
      });
      if (dto.capabilities.length) {
        await tx.planProductCapabilityGrant.createMany({
          data: dto.capabilities.map((grant) => ({
            planId,
            productId: product.id,
            capabilityId: capabilities.find(
              ({ key }) => key === grant.capabilityKey,
            )!.id,
            included: grant.included,
          })),
        });
      }
      await tx.planProductLimitGrant.deleteMany({
        where: { planId, productId: product.id },
      });
      if (dto.limits.length) {
        await tx.planProductLimitGrant.createMany({
          data: dto.limits.map((grant) => ({
            planId,
            productId: product.id,
            limitId: limits.find(({ key }) => key === grant.limitKey)!.id,
            value: grant.value,
          })),
        });
      }
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.plan.product-configured',
        null,
        {
          planId,
          productKey: product.productKey,
          ...dto,
        },
      );
      const subscriptions = await tx.tenantSubscription.findMany({
        where: {
          planId,
          status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
        },
        select: { tenantId: true },
      });
      return subscriptions.map(({ tenantId }) => tenantId);
    });
    await Promise.all(
      tenantIds.map((tenantId) => this.entitlements.resolve(tenantId)),
    );
    return {
      planId,
      productKey: product.productKey,
      affectedTenantCount: tenantIds.length,
    };
  }

  async planImpact(
    planId: string,
    productKey: string,
    dto: ConfigurePlanProductDto,
  ) {
    const product = await this.registry.get(productKey);
    return this.database.transaction(async (tx) => {
      const current = await tx.planProductGrant.findUnique({
        where: { planId_productId: { planId, productId: product.id } },
      });
      const subscriptions = await tx.tenantSubscription.findMany({
        where: {
          planId,
          status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
        },
        select: {
          tenant: { select: { id: true, companyName: true, subdomain: true } },
        },
      });
      return {
        productKey: product.productKey,
        currentlyIncluded: current?.included ?? false,
        nextIncluded: dto.included,
        affectedTenantCount: subscriptions.length,
        affectedTenants: subscriptions.slice(0, 25).map(({ tenant }) => tenant),
      };
    });
  }

  async overrideProduct(
    tenantId: string,
    productKey: string,
    dto: TenantProductOverrideDto,
    actor: AuthenticatedPlatformUser,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    this.assertIdempotencyKey(metadata);
    this.assertBounded(dto);
    const product = await this.registry.get(productKey);
    await this.database.transaction(async (tx) => {
      const current = await tx.tenantProductOverride.findUnique({
        where: { tenantId_productId: { tenantId, productId: product.id } },
      });
      this.assertVersion(current?.version, dto.expectedVersion);
      if (dto.mode === 'INHERIT') {
        if (current)
          await tx.tenantProductOverride.delete({ where: { id: current.id } });
      } else {
        await tx.tenantProductOverride.upsert({
          where: { tenantId_productId: { tenantId, productId: product.id } },
          update: {
            mode: dto.mode,
            reason: dto.reason,
            startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
            endsAt: new Date(dto.endsAt!),
            changedBy: actor.platformUserId,
            version: { increment: 1 },
          },
          create: {
            tenantId,
            productId: product.id,
            mode: dto.mode,
            reason: dto.reason,
            startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
            endsAt: new Date(dto.endsAt!),
            changedBy: actor.platformUserId,
          },
        });
      }
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.tenant.product-override',
        current,
        dto,
      );
    });
    return this.entitlements.resolve(tenantId);
  }

  async overrideCapability(
    tenantId: string,
    productKey: string,
    dto: TenantCapabilityOverrideDto,
    actor: AuthenticatedPlatformUser,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    this.assertIdempotencyKey(metadata);
    this.assertBounded(dto);
    const product = await this.registry.get(productKey);
    return this.database
      .transaction(async (tx) => {
        const capability = await tx.productCapabilityDefinition.findFirst({
          where: { productId: product.id, key: dto.capabilityKey },
        });
        if (!capability)
          throw new NotFoundException({ code: 'PRODUCT_CAPABILITY_NOT_FOUND' });
        const current = await tx.tenantProductCapabilityOverride.findUnique({
          where: {
            tenantId_capabilityId: { tenantId, capabilityId: capability.id },
          },
        });
        this.assertVersion(current?.version, dto.expectedVersion);
        if (dto.mode === 'INHERIT') {
          if (current)
            await tx.tenantProductCapabilityOverride.delete({
              where: { id: current.id },
            });
        } else {
          await tx.tenantProductCapabilityOverride.upsert({
            where: {
              tenantId_capabilityId: { tenantId, capabilityId: capability.id },
            },
            update: {
              mode: dto.mode,
              reason: dto.reason,
              startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
              endsAt: new Date(dto.endsAt!),
              changedBy: actor.platformUserId,
              version: { increment: 1 },
            },
            create: {
              tenantId,
              productId: product.id,
              capabilityId: capability.id,
              mode: dto.mode,
              reason: dto.reason,
              startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
              endsAt: new Date(dto.endsAt!),
              changedBy: actor.platformUserId,
            },
          });
        }
        await this.audit(
          tx,
          actor,
          metadata,
          'platform.tenant.capability-override',
          current,
          dto,
        );
        return { accepted: true };
      })
      .then(async () => this.entitlements.resolve(tenantId));
  }

  async overrideLimit(
    tenantId: string,
    productKey: string,
    dto: TenantLimitOverrideDto,
    actor: AuthenticatedPlatformUser,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    this.assertIdempotencyKey(metadata);
    const product = await this.registry.get(productKey);
    return this.database
      .transaction(async (tx) => {
        const limit = await tx.productLimitDefinition.findFirst({
          where: { productId: product.id, key: dto.limitKey },
        });
        if (!limit)
          throw new NotFoundException({ code: 'PRODUCT_LIMIT_NOT_FOUND' });
        const current = await tx.tenantProductLimitOverride.findUnique({
          where: { tenantId_limitId: { tenantId, limitId: limit.id } },
        });
        this.assertVersion(current?.version, dto.expectedVersion);
        await tx.tenantProductLimitOverride.upsert({
          where: { tenantId_limitId: { tenantId, limitId: limit.id } },
          update: {
            value: dto.value,
            reason: dto.reason,
            startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
            endsAt: new Date(dto.endsAt),
            changedBy: actor.platformUserId,
            version: { increment: 1 },
          },
          create: {
            tenantId,
            productId: product.id,
            limitId: limit.id,
            value: dto.value,
            reason: dto.reason,
            startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
            endsAt: new Date(dto.endsAt),
            changedBy: actor.platformUserId,
          },
        });
        await this.audit(
          tx,
          actor,
          metadata,
          'platform.tenant.limit-override',
          current,
          dto,
        );
        return { accepted: true };
      })
      .then(async () => this.entitlements.resolve(tenantId));
  }

  private assertBounded(dto: TenantProductOverrideDto) {
    if (dto.mode !== 'INHERIT' && !dto.endsAt) {
      throw new UnprocessableEntityException({
        code: 'OVERRIDE_EXPIRY_REQUIRED',
        message: 'Exceptional overrides must have an expiry',
      });
    }
  }

  private assertVersion(
    current: number | undefined,
    expected: number | undefined,
  ) {
    if (current && expected !== current) {
      throw new ConflictException({
        code: 'OPTIMISTIC_CONCURRENCY_CONFLICT',
        message: `Override changed; expected version ${current}`,
      });
    }
  }

  private assertFreshMfa(actor: AuthenticatedPlatformUser) {
    const verifiedAt = new Date(actor.mfaVerifiedAt).getTime();
    if (
      !Number.isFinite(verifiedAt) ||
      Date.now() - verifiedAt > MFA_FRESH_MS
    ) {
      throw new ForbiddenException({ code: 'FRESH_MFA_REQUIRED' });
    }
  }

  private assertIdempotencyKey(metadata: ProductRequestMetadata) {
    if (!metadata.idempotencyKey) {
      throw new UnprocessableEntityException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message:
          'Commercial entitlement writes require an Idempotency-Key header',
      });
    }
  }

  private audit(
    tx: PlatformTransaction,
    actor: AuthenticatedPlatformUser,
    metadata: ProductRequestMetadata,
    action: string,
    oldValue: unknown,
    newValue: unknown,
  ) {
    return tx.systemAuditLog.create({
      data: {
        actorPlatformUserId: actor.platformUserId,
        action,
        module: 'platform.product-commercial',
        oldValue: this.jsonValue(oldValue),
        newValue: this.jsonValue(newValue),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        requestId: metadata.requestId,
      },
    });
  }

  private jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value == null) return undefined;
    const parsed: unknown = JSON.parse(JSON.stringify(value));
    return parsed as Prisma.InputJsonValue;
  }
}

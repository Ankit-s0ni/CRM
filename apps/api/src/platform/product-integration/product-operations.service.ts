import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ProductKey } from '@mariya-abdul/deltcrm-product-contracts';
import { PlatformDatabaseService } from '../../shared/database/platform-database.service';
import type {
  ProductLifecycleAcknowledgementDto,
  ProductUsageDto,
} from './dto/product-registration.dto';
import { ProductEntitlementService } from './product-entitlement.service';
import { ProductRegistryService } from './product-registry.service';

@Injectable()
export class ProductOperationsService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly registry: ProductRegistryService,
    private readonly entitlements: ProductEntitlementService,
  ) {}

  async catalog(tenantId: string) {
    const [products, effective] = await Promise.all([
      this.registry.list(),
      this.entitlements.resolve(tenantId),
    ]);
    const provisioning = await this.database.transaction((tx) =>
      tx.productProvisioningInstance.findMany({ where: { tenantId } }),
    );
    return {
      entitlementVersion: effective.version,
      products: products.map((product) => {
        const entitlement = effective.products.find(
          ({ key }) => key === product.productKey,
        );
        const instance = provisioning.find(
          ({ productId }) => productId === product.id,
        );
        return {
          productKey: product.productKey,
          audience: product.audience,
          displayName: product.displayName,
          description: product.description,
          status: product.status,
          manifestVersion: product.activeRevision?.manifestVersion ?? null,
          routes: product.activeRevision
            ? (product.activeRevision.manifest as Record<string, unknown>)
                .routes
            : null,
          entitled: entitlement?.active ?? false,
          capabilities: entitlement?.capabilities ?? {},
          limits: entitlement?.limits ?? {},
          provisioning: instance?.state ?? 'NOT_REQUESTED',
        };
      }),
    };
  }

  async acknowledge(
    authenticatedProduct: ProductKey,
    tenantId: string,
    productKey: string,
    dto: ProductLifecycleAcknowledgementDto,
  ) {
    this.assertProductScope(authenticatedProduct, productKey);
    const product = await this.registry.active(productKey);
    return this.database.transaction(async (tx) => {
      const declared = await tx.productEventDefinition.findFirst({
        where: {
          productId: product.id,
          eventKey: dto.eventKey,
          direction: 'PUBLISHED',
        },
      });
      if (!declared) {
        throw new ForbiddenException({
          code: 'PRODUCT_EVENT_NOT_DECLARED',
          message:
            'The acknowledgement event is not declared by the active product',
        });
      }
      const delivery = await tx.productLifecycleDelivery.findFirst({
        where: { eventId: dto.eventId, tenantId, productId: product.id },
      });
      if (!delivery)
        throw new NotFoundException({ code: 'LIFECYCLE_DELIVERY_NOT_FOUND' });
      const acknowledgedAt = new Date();
      await tx.productLifecycleDelivery.update({
        where: { id: delivery.id },
        data: {
          acknowledgedAt,
          lastError: dto.failureCode ?? null,
          deadLetteredAt: null,
        },
      });
      const provisioning = await tx.productProvisioningInstance.update({
        where: { tenantId_productId: { tenantId, productId: product.id } },
        data: {
          state: dto.state,
          failureCode: dto.failureCode ?? null,
          version: { increment: 1 },
        },
      });
      return { acknowledgedAt, provisioning };
    });
  }

  async reportUsage(
    authenticatedProduct: ProductKey,
    tenantId: string,
    productKey: string,
    dto: ProductUsageDto,
  ) {
    this.assertProductScope(authenticatedProduct, productKey);
    const product = await this.registry.active(productKey);
    return this.database.transaction(async (tx) => {
      const limit = await tx.productLimitDefinition.findFirst({
        where: { productId: product.id, key: dto.metricKey, deprecated: false },
      });
      if (!limit) {
        throw new ForbiddenException({
          code: 'PRODUCT_USAGE_METRIC_NOT_DECLARED',
          message: 'Usage can only be reported for registered limit keys',
        });
      }
      const entitlement = await tx.effectiveTenantProductEntitlement.findUnique(
        {
          where: { tenantId_productId: { tenantId, productId: product.id } },
        },
      );
      if (!entitlement?.active) {
        throw new ForbiddenException({ code: 'PRODUCT_NOT_ENTITLED' });
      }
      if (entitlement.entitlementVersion !== dto.entitlementVersion) {
        throw new ConflictException({
          code: 'STALE_ENTITLEMENT_VERSION',
          message: 'Refresh product entitlements before reporting usage',
        });
      }
      const snapshot = await tx.productUsageSnapshot.upsert({
        where: { sourceEventId: dto.sourceEventId },
        update: {},
        create: {
          tenantId,
          productId: product.id,
          metricKey: dto.metricKey,
          value: dto.value,
          entitlementVersion: dto.entitlementVersion,
          sourceEventId: dto.sourceEventId,
          occurredAt: new Date(dto.occurredAt),
        },
      });
      const limits = entitlement.limits as Record<string, number>;
      const allowed = Number(limits[dto.metricKey] ?? 0);
      return {
        snapshot,
        limit: allowed,
        exceeded: limit.enforcement === 'HARD' && dto.value > allowed,
        enforcement: limit.enforcement,
      };
    });
  }

  private assertProductScope(
    authenticatedProduct: ProductKey,
    requested: string,
  ) {
    if (authenticatedProduct !== requested.toUpperCase()) {
      throw new ForbiddenException({
        code: 'SERVICE_PRODUCT_SCOPE_MISMATCH',
        message: 'The service identity cannot access another product',
      });
    }
  }
}

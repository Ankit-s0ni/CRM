import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import {
  PRODUCT_PLATFORM_PORT,
  assertProductManifestV2,
  type EffectiveEntitlements,
  type NavigationContract,
  type ProductIdentityStatus,
  type ProductKey,
  type ProductPlatformPort,
  type ProductProvisioningStatus,
  type ProductTokenRequest,
  type ProductTokenResponse,
  type StableIdentifiers,
} from '@mariya-abdul/deltcrm-product-contracts';
import { PlatformDatabaseService } from '../../shared/database/platform-database.service';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { ProductEntitlementService } from './product-entitlement.service';
import { ProductRegistryService } from './product-registry.service';
import { ProductSigningKeyService } from './product-signing-key.service';

const TOKEN_TTL_SECONDS = 15 * 60;

@Injectable()
export class ProductIntegrationService implements ProductPlatformPort {
  readonly platformPortToken = PRODUCT_PLATFORM_PORT;

  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly jwt: JwtService,
    private readonly signingKeys: ProductSigningKeyService,
    private readonly registry: ProductRegistryService,
    private readonly entitlementResolver: ProductEntitlementService,
  ) {}

  async manifest(productKey: ProductKey) {
    return (await this.registry.active(productKey)).manifest;
  }

  jwks() {
    return this.signingKeys.jwks();
  }

  async issueToken(
    user: AuthenticatedUser,
    request: ProductTokenRequest,
    requestId?: string,
  ): Promise<ProductTokenResponse> {
    if (!request.productKey && !request.audience) {
      throw new NotFoundException({
        code: 'PRODUCT_SELECTOR_REQUIRED',
        message: 'A productKey is required',
      });
    }
    const registered = request.productKey
      ? await this.registry.active(request.productKey.toUpperCase())
      : await this.registry.byAudience(request.audience!);
    if (request.audience && request.audience !== registered.audience) {
      throw new NotFoundException({
        code: 'PRODUCT_SELECTOR_MISMATCH',
        message: 'Product key and audience do not identify the same product',
      });
    }
    const productKey = registered.productKey;
    if (process.env.PRODUCT_TOKEN_REQUIRE_HEALTHY === 'true') {
      const environment = process.env.DEPLOYMENT_ENVIRONMENT ?? 'development';
      const deployment = registered.deployments.find(
        (candidate) => candidate.environment === environment,
      );
      if (
        !deployment ||
        deployment.maintenance ||
        deployment.health !== 'HEALTHY'
      ) {
        throw new ForbiddenException({
          code: 'PRODUCT_UNHEALTHY',
          message: `${productKey} is not healthy enough to issue new sessions`,
        });
      }
    }
    const identity = {
      tenantId: user.tenantId,
      userId: user.userId,
      membershipId: user.userId,
    };
    const [identityStatus, entitlements, locale, provisioning, permissions] =
      await Promise.all([
        this.getIdentityStatus(identity),
        this.getEntitlements(user.tenantId),
        this.resolveTenantLocale(user.tenantId),
        this.getProvisioningStatus(user.tenantId, productKey),
        this.resolvePermissions(user.tenantId, user.userId),
      ]);
    this.assertActiveIdentity(identityStatus);
    const product = entitlements.products.find(({ key }) => key === productKey);
    if (!product?.active) {
      throw new ForbiddenException({
        code: 'PRODUCT_NOT_ENTITLED',
        message: `${productKey} is not enabled for this workspace`,
      });
    }
    if (provisioning.state !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'PRODUCT_NOT_PROVISIONED',
        message: `${productKey} is not active for this workspace`,
      });
    }

    const capabilities = Object.entries(product.capabilities)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);
    const productPermissions = this.productPermissions(
      registered.permissions,
      permissions,
      new Set(capabilities),
    );
    const tokenId = randomUUID();
    const accessToken = this.jwt.sign(
      {
        tenantId: user.tenantId,
        userId: user.userId,
        membershipId: user.userId,
        roles: user.roles,
        products: [productKey],
        capabilities,
        permissions: productPermissions,
        locale,
        entitlementVersion: entitlements.version,
      },
      {
        privateKey: this.signingKeys.privateKey,
        algorithm: 'RS256',
        keyid: this.signingKeys.keyId,
        issuer: this.signingKeys.issuer,
        audience: registered.audience,
        subject: user.userId,
        jwtid: tokenId,
        expiresIn: TOKEN_TTL_SECONDS,
      },
    );

    await this.database.transaction((tx) =>
      tx.systemAuditLog.create({
        data: {
          tenantId: user.tenantId,
          action: 'platform.product-token.issued',
          module: 'product-integration',
          newValue: {
            audience: registered.audience,
            productKey,
            userId: user.userId,
            jti: tokenId,
            expiresIn: TOKEN_TTL_SECONDS,
          },
          requestId,
        },
      }),
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: TOKEN_TTL_SECONDS,
    };
  }

  async navigation(user: AuthenticatedUser): Promise<NavigationContract> {
    const [identityStatus, entitlements, sourcePermissions, products] =
      await Promise.all([
        this.getIdentityStatus({
          tenantId: user.tenantId,
          userId: user.userId,
          membershipId: user.userId,
        }),
        this.getEntitlements(user.tenantId),
        this.resolvePermissions(user.tenantId, user.userId),
        this.registry.list(),
      ]);
    this.assertActiveIdentity(identityStatus);
    const items: NavigationContract['items'] = [
      { key: 'home', hrefTemplate: '/{locale}/app' },
    ];
    for (const registered of products) {
      if (registered.status !== 'ACTIVE' || !registered.activeRevision)
        continue;
      const entitlement = entitlements.products.find(
        ({ key }) => key === registered.productKey,
      );
      if (!entitlement?.active) continue;
      const capabilities = new Set(
        Object.entries(entitlement.capabilities)
          .filter(([, active]) => active)
          .map(([key]) => key),
      );
      const permissions = this.productPermissions(
        registered.permissions,
        sourcePermissions,
        capabilities,
      );
      if (!permissions.length) continue;
      const manifest: unknown = registered.activeRevision.manifest;
      assertProductManifestV2(manifest);
      items.push({
        key: manifest.navigation.key,
        hrefTemplate: manifest.routes.webPath,
        requiredProduct: registered.productKey,
      });
    }
    return { items };
  }

  async getIdentityStatus(
    identity: StableIdentifiers,
  ): Promise<ProductIdentityStatus> {
    return this.database.transaction(async (tx) => {
      const [tenant, user] = await Promise.all([
        tx.tenant.findUnique({
          where: { id: identity.tenantId },
          select: { id: true, status: true },
        }),
        tx.user.findFirst({
          where: { id: identity.userId, tenantId: identity.tenantId },
          select: { id: true, tenantId: true, status: true },
        }),
      ]);
      const tenantStatus = !tenant
        ? 'UNAVAILABLE'
        : ['ACTIVE', 'TRIAL'].includes(tenant.status)
          ? 'ACTIVE'
          : 'SUSPENDED';
      const userStatus = !user
        ? 'UNAVAILABLE'
        : user.status === 'ACTIVE'
          ? 'ACTIVE'
          : 'SUSPENDED';
      const membershipStatus =
        !user || identity.membershipId !== user.id ? 'UNAVAILABLE' : userStatus;
      return {
        ...identity,
        tenantStatus,
        userStatus,
        membershipStatus,
        effectiveAt: new Date().toISOString(),
      };
    });
  }

  getEntitlements(tenantId: string): Promise<EffectiveEntitlements> {
    return this.entitlementResolver.resolve(tenantId);
  }

  async getProvisioningStatus(
    tenantId: string,
    productKey: ProductKey,
  ): Promise<ProductProvisioningStatus> {
    const registered = await this.registry.active(productKey);
    const provisioning = await this.database.transaction((tx) =>
      tx.productProvisioningInstance.findUnique({
        where: {
          tenantId_productId: { tenantId, productId: registered.id },
        },
      }),
    );
    return {
      tenantId,
      productKey: registered.productKey,
      state: provisioning?.state ?? 'NOT_REQUESTED',
      attempt: provisioning?.attempt ?? 0,
      updatedAt: (provisioning?.updatedAt ?? new Date()).toISOString(),
      failureCode: provisioning?.failureCode ?? undefined,
    };
  }

  private async resolveTenantLocale(tenantId: string): Promise<'en' | 'ar'> {
    const settings = await this.database.transaction((tx) =>
      tx.tenantSettings.findUnique({
        where: { tenantId },
        select: { locale: true },
      }),
    );
    return settings?.locale?.startsWith('ar') ? 'ar' : 'en';
  }

  private async resolvePermissions(tenantId: string, userId: string) {
    return this.database.transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, tenantId },
        select: {
          roles: {
            select: {
              role: {
                select: {
                  permissions: {
                    select: { permission: { select: { key: true } } },
                  },
                },
              },
            },
          },
        },
      });
      return new Set(
        user?.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.key),
        ) ?? [],
      );
    });
  }

  private productPermissions(
    definitions: Array<{
      key: string;
      platformPermissionAliases: string[];
      platformPermissionPrefixAliases: string[];
      requiredCapabilityKeys: string[];
      deprecated: boolean;
    }>,
    source: ReadonlySet<string>,
    capabilities: ReadonlySet<string>,
  ) {
    return definitions
      .filter((definition) => !definition.deprecated)
      .filter((definition) =>
        definition.requiredCapabilityKeys.every((key) => capabilities.has(key)),
      )
      .filter(
        (definition) =>
          source.has(definition.key) ||
          definition.platformPermissionAliases.some((key) => source.has(key)) ||
          definition.platformPermissionPrefixAliases.some((prefix) =>
            [...source].some((permission) => permission.startsWith(prefix)),
          ),
      )
      .map(({ key }) => key);
  }

  private assertActiveIdentity(identity: ProductIdentityStatus) {
    if (identity.tenantStatus !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'TENANT_ACCESS_SUSPENDED',
        message: 'This workspace is not active',
      });
    }
    if (
      identity.userStatus !== 'ACTIVE' ||
      identity.membershipStatus !== 'ACTIVE'
    ) {
      throw new ForbiddenException({
        code: 'PRODUCT_IDENTITY_INACTIVE',
        message: 'This user does not have an active workspace membership',
      });
    }
  }
}

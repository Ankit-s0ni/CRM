import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import {
  PRODUCT_PLATFORM_PORT,
  type EffectiveEntitlements,
  type NavigationContract,
  type ProductAudience,
  type ProductIdentityStatus,
  type ProductKey,
  type ProductPlatformPort,
  type ProductProvisioningStatus,
  type StableIdentifiers,
  type ProductTokenResponse,
} from '@deltcrm/product-contracts';
import {
  HRMS_AUDIENCE,
  HRMS_CAPABILITIES,
  HRMS_MANIFEST,
  HRMS_PERMISSIONS,
} from '@deltcrm/product-contracts/hrms';
import { PrismaService } from '../../shared/database/prisma.service';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { ProductSigningKeyService } from './product-signing-key.service';
import {
  resolveHrmsProvisioningStatus,
  type ProductLifecycleDeliverySnapshot,
} from './product-lifecycle';

const TOKEN_TTL_SECONDS = 15 * 60;

@Injectable()
export class ProductIntegrationService implements ProductPlatformPort {
  readonly platformPortToken = PRODUCT_PLATFORM_PORT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly signingKeys: ProductSigningKeyService,
  ) {}

  manifest(productKey: ProductKey) {
    if (productKey !== 'HRMS') {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_REGISTERED',
        message: `${productKey} is not registered`,
      });
    }
    return HRMS_MANIFEST;
  }

  jwks() {
    return this.signingKeys.jwks();
  }

  async issueToken(
    user: AuthenticatedUser,
    audience: ProductAudience,
    requestId?: string,
  ): Promise<ProductTokenResponse> {
    const productKey = this.productForAudience(audience);
    const identity = {
      tenantId: user.tenantId,
      userId: user.userId,
      membershipId: user.userId,
    };
    const [identityStatus, entitlements, locale] = await Promise.all([
      this.getIdentityStatus(identity),
      this.getEntitlements(user.tenantId),
      this.resolveTenantLocale(user.tenantId),
    ]);
    this.assertActiveIdentity(identityStatus);
    const product = entitlements.products.find(({ key }) => key === productKey);
    if (!product?.active) {
      throw new ForbiddenException({
        code: 'PRODUCT_NOT_ENTITLED',
        message: `${productKey} is not enabled for this workspace`,
      });
    }

    const permissions = await this.resolvePermissions(
      user.tenantId,
      user.userId,
    );
    const productPermissions = this.mapHrmsPermissions(permissions);
    const capabilities = Object.entries(product.capabilities)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);
    const tokenId = randomUUID();
    const accessToken = this.jwt.sign(
      {
        tenantId: user.tenantId,
        userId: user.userId,
        // The current schema has one tenant membership per user. Keep this
        // compatibility projection until Membership becomes a Platform entity.
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
        audience,
        subject: user.userId,
        jwtid: tokenId,
        expiresIn: TOKEN_TTL_SECONDS,
      },
    );

    await this.prisma.forAdmin((tx) =>
      tx.tenantAuditLog.create({
        data: {
          tenantId: user.tenantId,
          actorUserId: user.userId,
          action: 'platform.product-token.issued',
          module: 'product-integration',
          entityType: 'User',
          entityId: user.userId,
          newValue: {
            audience,
            productKey,
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

  private async resolveTenantLocale(tenantId: string): Promise<'en' | 'ar'> {
    const settings = await this.prisma.forAdmin((tx) =>
      tx.tenantSettings.findUnique({
        where: { tenantId },
        select: { locale: true },
      }),
    );
    return settings?.locale?.startsWith('ar') ? 'ar' : 'en';
  }

  async navigation(user: AuthenticatedUser): Promise<NavigationContract> {
    const [identityStatus, entitlements, permissions] = await Promise.all([
      this.getIdentityStatus({
        tenantId: user.tenantId,
        userId: user.userId,
        membershipId: user.userId,
      }),
      this.getEntitlements(user.tenantId),
      this.resolvePermissions(user.tenantId, user.userId),
    ]);
    this.assertActiveIdentity(identityStatus);
    const hrms = entitlements.products.find(({ key }) => key === 'HRMS');
    const mapped = new Set(this.mapHrmsPermissions(permissions));
    const items: NavigationContract['items'] = [
      { key: 'home', hrefTemplate: '/{locale}/app' },
    ];
    if (hrms?.active && mapped.size > 0) {
      items.push({
        key: 'hrms',
        hrefTemplate: '/{locale}/app/hrms',
        requiredProduct: 'HRMS',
      });
    }
    return { items };
  }

  async getIdentityStatus(
    identity: StableIdentifiers,
  ): Promise<ProductIdentityStatus> {
    return this.prisma.forAdmin(async (tx) => {
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

  async getEntitlements(tenantId: string): Promise<EffectiveEntitlements> {
    return this.prisma.forAdmin(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          status: true,
          settings: { select: { runtimeConfigVersion: true } },
        },
      });
      if (!tenant) {
        throw new NotFoundException({
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant does not exist',
        });
      }

      const now = new Date();
      const [activeModules, subscription, overrides] = await Promise.all([
        tx.tenantModule.findMany({
          where: { tenantId, isActive: true },
          include: { module: true },
        }),
        tx.tenantSubscription.findFirst({
          where: { tenantId },
          include: {
            plan: {
              include: {
                capabilities: { include: { capability: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        tx.tenantCapabilityOverride.findMany({
          where: { tenantId },
          include: { capability: true },
        }),
      ]);
      const moduleKeys = new Set(activeModules.map(({ module }) => module.key));
      const capabilityKeys = new Set(
        subscription?.plan.capabilities
          .filter(({ included }) => included)
          .map(({ capability }) => capability.key) ?? [],
      );
      for (const override of overrides) {
        const active =
          (!override.startsAt || override.startsAt <= now) &&
          (!override.endsAt || override.endsAt > now);
        if (!active || override.mode === 'INHERIT') continue;
        if (override.mode === 'ENABLE')
          capabilityKeys.add(override.capability.key);
        if (override.mode === 'DISABLE')
          capabilityKeys.delete(override.capability.key);
      }

      const tenantAvailable = !['SUSPENDED', 'CHURNED'].includes(tenant.status);
      const attendanceActive = tenantAvailable && moduleKeys.has('ATTENDANCE');
      const payrollActive = tenantAvailable && moduleKeys.has('PAYROLL');
      const hrmsActive = attendanceActive || payrollActive;
      return {
        tenantId,
        subscriptionStatus:
          tenant.status === 'SUSPENDED'
            ? 'SUSPENDED'
            : subscription?.status === 'CANCELLED'
              ? 'CANCELED'
              : (subscription?.status ?? 'NONE'),
        products: [
          {
            key: 'HRMS',
            active: hrmsActive,
            capabilities: {
              [HRMS_CAPABILITIES.EMPLOYEES]: hrmsActive,
              [HRMS_CAPABILITIES.ORGANIZATION]: hrmsActive,
              [HRMS_CAPABILITIES.ATTENDANCE]:
                attendanceActive && capabilityKeys.has('ATTENDANCE_CORE'),
              [HRMS_CAPABILITIES.LEAVE]:
                attendanceActive && capabilityKeys.has('ATTENDANCE_LEAVE'),
              [HRMS_CAPABILITIES.PAYROLL]: payrollActive,
            },
            limits: { employees: subscription?.plan.maxEmployees ?? 0 },
          },
        ],
        version: tenant.settings?.runtimeConfigVersion ?? 0,
        effectiveAt: now.toISOString(),
      };
    });
  }

  async getProvisioningStatus(
    tenantId: string,
    productKey: ProductKey,
  ): Promise<ProductProvisioningStatus> {
    this.manifest(productKey);
    const entitlement = await this.getEntitlements(tenantId);
    const product = entitlement.products.find(({ key }) => key === productKey);
    const delivery = await this.latestLifecycleDelivery(tenantId);
    return {
      tenantId,
      productKey,
      ...resolveHrmsProvisioningStatus({
        productActive: product?.active ?? false,
        subscriptionStatus: entitlement.subscriptionStatus,
        effectiveAt: entitlement.effectiveAt,
        delivery,
      }),
    };
  }

  private latestLifecycleDelivery(
    tenantId: string,
  ): Promise<ProductLifecycleDeliverySnapshot | null> {
    return this.prisma.forAdmin((tx) =>
      tx.outboxEvent.findFirst({
        where: {
          tenantId,
          eventKey: {
            in: [
              'platform.product.activation-requested.v1',
              'platform.product.suspension-requested.v1',
            ],
          },
        },
        select: {
          eventKey: true,
          createdAt: true,
          publishedAt: true,
          lockedAt: true,
          attemptCount: true,
          lastError: true,
          deadLetteredAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ) as Promise<ProductLifecycleDeliverySnapshot | null>;
  }

  private productForAudience(audience: ProductAudience): ProductKey {
    if (audience === HRMS_AUDIENCE) return 'HRMS';
    throw new NotFoundException({
      code: 'PRODUCT_NOT_REGISTERED',
      message: `No product is registered for ${audience}`,
    });
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

  private async resolvePermissions(tenantId: string, userId: string) {
    return this.prisma.forAdmin(async (tx) => {
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

  private mapHrmsPermissions(source: Set<string>) {
    const mapped = new Set<string>();
    const hasPrefix = (prefix: string) =>
      [...source].some((permission) => permission.startsWith(prefix));
    if (source.has(PERMISSIONS.EMPLOYEES_READ))
      mapped.add(HRMS_PERMISSIONS.EMPLOYEES_READ);
    if (
      [
        PERMISSIONS.EMPLOYEES_CREATE,
        PERMISSIONS.EMPLOYEES_UPDATE,
        PERMISSIONS.EMPLOYEES_LIFECYCLE,
      ].some((permission) => source.has(permission))
    )
      mapped.add(HRMS_PERMISSIONS.EMPLOYEES_MANAGE);
    if (source.has(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ))
      mapped.add(HRMS_PERMISSIONS.ATTENDANCE_SELF_READ);
    if (source.has(PERMISSIONS.ATTENDANCE_RECORDS_SELF_WRITE))
      mapped.add(HRMS_PERMISSIONS.ATTENDANCE_SELF_WRITE);
    if (source.has(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ))
      mapped.add(HRMS_PERMISSIONS.DEVICES_SELF_READ);
    if (source.has(PERMISSIONS.ATTENDANCE_RECORDS_SELF_WRITE))
      mapped.add(HRMS_PERMISSIONS.DEVICES_SELF_WRITE);
    if (source.has(PERMISSIONS.ATTENDANCE_DEVICES_READ))
      mapped.add(HRMS_PERMISSIONS.DEVICES_READ);
    if (source.has(PERMISSIONS.ATTENDANCE_DEVICES_MANAGE)) {
      mapped.add(HRMS_PERMISSIONS.DEVICES_READ);
      mapped.add(HRMS_PERMISSIONS.DEVICES_MANAGE);
    }
    const selfAttendancePermissions = new Set<string>([
      PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ,
      PERMISSIONS.ATTENDANCE_RECORDS_SELF_WRITE,
      PERMISSIONS.REGULARIZATIONS_SELF,
    ]);
    if (
      [...source].some(
        (permission) =>
          permission.startsWith('attendance.') &&
          !selfAttendancePermissions.has(permission),
      )
    )
      mapped.add(HRMS_PERMISSIONS.ATTENDANCE_READ);
    if (
      [...source].some(
        (permission) =>
          permission.startsWith('attendance.') &&
          (permission.endsWith('.manage') || permission.endsWith('.generate')),
      )
    )
      mapped.add(HRMS_PERMISSIONS.ATTENDANCE_MANAGE);
    if (source.has(PERMISSIONS.LEAVE_SELF)) {
      mapped.add(HRMS_PERMISSIONS.LEAVE_SELF_READ);
      mapped.add(HRMS_PERMISSIONS.LEAVE_SELF_WRITE);
    }
    if (source.has(PERMISSIONS.LEAVE_APPROVE)) {
      mapped.add(HRMS_PERMISSIONS.LEAVE_READ);
      mapped.add(HRMS_PERMISSIONS.LEAVE_APPROVE);
    }
    if (source.has(PERMISSIONS.LEAVE_MANAGE)) {
      mapped.add(HRMS_PERMISSIONS.LEAVE_READ);
      mapped.add(HRMS_PERMISSIONS.LEAVE_MANAGE);
      mapped.add(HRMS_PERMISSIONS.LEAVE_APPROVE);
    }
    if (hasPrefix('payroll.')) mapped.add(HRMS_PERMISSIONS.PAYROLL_READ);
    if (
      [...source].some(
        (permission) =>
          permission.startsWith('payroll.') &&
          !permission.endsWith('.read') &&
          !permission.endsWith('.self'),
      )
    )
      mapped.add(HRMS_PERMISSIONS.PAYROLL_MANAGE);
    return [...mapped];
  }
}

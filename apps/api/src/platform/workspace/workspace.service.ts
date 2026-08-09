import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantStatus, TokenPurpose, UserStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(identifier: { tenantId?: string; subdomain?: string }) {
    const tenant = await this.prisma.forAdmin((tx) =>
      identifier.tenantId
        ? tx.tenant.findUnique({ where: { id: identifier.tenantId } })
        : tx.tenant.findUnique({
            where: {
              subdomain: identifier.subdomain?.trim().toLowerCase() ?? '',
            },
          }),
    );

    if (!tenant) {
      return {
        available: false,
        status: 'NOT_FOUND',
        errorCode: 'WORKSPACE_NOT_FOUND',
      };
    }

    const available =
      tenant.status === TenantStatus.TRIAL ||
      tenant.status === TenantStatus.ACTIVE;

    return {
      available,
      status: tenant.status,
      errorCode: available ? null : this.statusErrorCode(tenant.status),
      workspace: {
        id: tenant.id,
        companyName: tenant.companyName,
        subdomain: tenant.subdomain,
        logoUrl: tenant.companyLogo,
      },
      unavailableReason: available ? null : tenant.suspendedReason,
    };
  }

  async getModules(tenantId: string) {
    const tenantModules = await this.prisma.forAdmin((tx) =>
      tx.tenantModule.findMany({
        where: { tenantId, isActive: true },
        include: { module: true },
        orderBy: { module: { name: 'asc' } },
      }),
    );

    return {
      modules: tenantModules.map(({ module, activatedAt }) => ({
        key: module.key,
        name: module.name,
        description: module.description,
        icon: module.icon,
        availability: module.availability,
        dependencyKeys: module.dependencyKeys,
        conflictKeys: module.conflictKeys,
        activatedAt,
      })),
    };
  }

  async getModuleHealth(tenantId: string, inputKey: string) {
    const key = inputKey.trim().toUpperCase();
    return this.prisma.forTenant(async (tx) => {
      const entitlement = await tx.tenantModule.findFirst({
        where: { tenantId, isActive: true, module: { key } },
        include: { module: true },
      });
      if (!entitlement) {
        throw new NotFoundException({
          code: 'MODULE_NOT_ENTITLED',
          message: 'This module is not enabled for the workspace',
        });
      }
      const activeDependencies = entitlement.module.dependencyKeys.length
        ? await tx.tenantModule.findMany({
            where: {
              tenantId,
              isActive: true,
              module: { key: { in: entitlement.module.dependencyKeys } },
            },
            select: { module: { select: { key: true } } },
          })
        : [];
      const enabledDependencyKeys = new Set(
        activeDependencies.map(({ module }) => module.key),
      );
      const missingDependencies = entitlement.module.dependencyKeys.filter(
        (dependency) => !enabledDependencyKeys.has(dependency),
      );
      const issues = [
        ...missingDependencies.map((dependency) => ({
          code: 'MISSING_MODULE_DEPENDENCY',
          severity: 'BLOCKING',
          message: `${dependency} must be enabled before ${key} can operate.`,
          actionHref: '/app/settings/modules',
        })),
      ];
      return {
        data: {
          module: {
            key: entitlement.module.key,
            name: entitlement.module.name,
            description: entitlement.module.description,
            icon: entitlement.module.icon,
            availability: entitlement.module.availability,
            dependencyKeys: entitlement.module.dependencyKeys,
            conflictKeys: entitlement.module.conflictKeys,
            activatedAt: entitlement.activatedAt,
          },
          status: missingDependencies.length
            ? 'BLOCKED'
            : issues.length
              ? 'NEEDS_SETUP'
              : 'READY',
          dependencies: {
            required: entitlement.module.dependencyKeys,
            missing: missingDependencies,
          },
          configuration: {},
          issues,
        },
      };
    });
  }

  getSettingsHealth(tenantId: string, permissions: Set<string>) {
    return this.prisma.forTenant(async (tx) => {
      const enabledModules = await tx.tenantModule.findMany({
        where: { tenantId, isActive: true },
        select: { module: { select: { key: true } } },
      });
      const moduleKeys = new Set(
        enabledModules.map(({ module }) => module.key),
      );
      const categories: SettingsHealthCategory[] = [];

      if (permissions.has(PERMISSIONS.SETTINGS_READ)) {
        const [tenant, settings] = await Promise.all([
          tx.tenant.findUnique({
            where: { id: tenantId },
            select: { companyName: true, companyLogo: true },
          }),
          tx.tenantSettings.findUnique({
            where: { tenantId },
            select: { timezone: true, locale: true },
          }),
        ]);
        categories.push(
          healthCategory(
            'COMPANY',
            { profile: tenant ? 1 : 0, locale: settings ? 1 : 0 },
            [
              ...(!tenant
                ? [
                    healthIssue(
                      'COMPANY_PROFILE_MISSING',
                      'Complete the company profile.',
                      '/app/settings/company',
                    ),
                  ]
                : []),
              ...(!settings
                ? [
                    healthIssue(
                      'TENANT_SETTINGS_MISSING',
                      'Choose the workspace timezone and locale.',
                      '/app/settings/company',
                    ),
                  ]
                : []),
            ],
          ),
        );
      }

      if (permissions.has(PERMISSIONS.ROLES_READ)) {
        const [activeUsers, roles, pendingInvitations] = await Promise.all([
          tx.user.count({ where: { tenantId, status: UserStatus.ACTIVE } }),
          tx.role.count({ where: { OR: [{ tenantId }, { tenantId: null }] } }),
          tx.verificationToken.count({
            where: {
              tenantId,
              purpose: TokenPurpose.USER_INVITE,
              consumedAt: null,
              expiresAt: { gt: new Date() },
            },
          }),
        ]);
        categories.push(
          healthCategory('ACCESS', { activeUsers, roles, pendingInvitations }),
        );
      }

      if (permissions.has(PERMISSIONS.MODULES_READ)) {
        categories.push(
          healthCategory(
            'MODULES',
            { enabled: moduleKeys.size },
            moduleKeys.size
              ? []
              : [
                  healthIssue(
                    'NO_ENABLED_MODULES',
                    'No business modules are enabled for this workspace.',
                    '/app/settings/modules',
                  ),
                ],
          ),
        );
      }

      if (permissions.has(PERMISSIONS.NOTIFICATIONS_SELF)) {
        const [templates, preferences] = await Promise.all([
          tx.notificationTemplate.count({ where: { isActive: true } }),
          tx.notificationPreference.count({ where: { tenantId } }),
        ]);
        categories.push(
          healthCategory('NOTIFICATIONS', { templates, preferences }),
        );
      }

      if (permissions.has(PERMISSIONS.BILLING_SUBSCRIPTION_READ)) {
        const subscriptions = await tx.tenantSubscription.count({
          where: { tenantId },
        });
        categories.push(
          healthCategory(
            'BILLING',
            { subscriptions },
            subscriptions
              ? []
              : [
                  healthIssue(
                    'SUBSCRIPTION_MISSING',
                    'The workspace does not have a subscription record.',
                    '/app/settings/billing',
                  ),
                ],
          ),
        );
      }

      if (permissions.has(PERMISSIONS.AUDIT_READ)) {
        categories.push(
          healthCategory('AUDIT', {
            records: await tx.tenantAuditLog.count({ where: { tenantId } }),
          }),
        );
      }

      categories.push(
        healthCategory(
          'INTEGRATIONS',
          integrationConfigurationCounts(),
          integrationIssues(),
        ),
      );

      return { data: { categories, updatedAt: new Date().toISOString() } };
    });
  }

  getIntegrationDiagnostics() {
    return {
      data: {
        providers: integrationProviders(),
        note: 'Provider credentials are managed by the DeltCRM deployment and are never returned to the tenant portal.',
      },
    };
  }

  private statusErrorCode(status: TenantStatus) {
    if (status === TenantStatus.SUSPENDED) {
      return 'TENANT_SUSPENDED';
    }

    if (status === TenantStatus.CHURNED) {
      return 'TENANT_CHURNED';
    }

    return 'WORKSPACE_UNAVAILABLE';
  }
}

type SettingsHealthIssue = {
  code: string;
  severity: string;
  message: string;
  actionHref: string;
  count?: number;
};

type SettingsHealthCategory = {
  key: string;
  status: 'READY' | 'NEEDS_SETUP';
  configuration: Record<string, number>;
  issues: SettingsHealthIssue[];
};

function healthCategory(
  key: string,
  configuration: Record<string, number>,
  issues: SettingsHealthIssue[] = [],
): SettingsHealthCategory {
  return {
    key,
    status: issues.length ? 'NEEDS_SETUP' : 'READY',
    configuration,
    issues,
  };
}

function healthIssue(
  code: string,
  message: string,
  actionHref: string,
  count?: number,
): SettingsHealthIssue {
  return {
    code,
    severity: 'RECOMMENDED',
    message,
    actionHref,
    ...(count === undefined ? {} : { count }),
  };
}

function integrationProviders() {
  return [
    providerDiagnostic(
      'EMAIL',
      'Transactional email',
      ['EMAIL_GATEWAY_URL', 'EMAIL_GATEWAY_TOKEN'],
      true,
    ),
    providerDiagnostic(
      'STORAGE',
      'Private document storage',
      ['S3_ENDPOINT', 'S3_PRIVATE_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'],
      true,
    ),
    providerDiagnostic(
      'PAYMENTS',
      'Online payments',
      ['STRIPE_CHARGE_URL', 'STRIPE_HEALTH_URL', 'STRIPE_API_KEY'],
      process.env.STRIPE_ENABLED === 'true',
    ),
  ];
}

function providerDiagnostic(
  key: string,
  name: string,
  requiredVariables: string[],
  enabled: boolean,
) {
  if (!enabled) {
    return {
      key,
      name,
      status: 'NOT_ENABLED',
      message: 'This optional provider is not enabled for the deployment.',
    };
  }
  const configured = requiredVariables.every((variable) =>
    Boolean(process.env[variable]?.trim()),
  );
  return {
    key,
    name,
    status: configured ? 'CONFIGURED' : 'NEEDS_CONFIGURATION',
    message: configured
      ? 'Required deployment configuration is present.'
      : 'DeltCRM deployment configuration is incomplete. Contact platform support.',
  };
}

function integrationConfigurationCounts() {
  const providers = integrationProviders();
  return {
    configured: providers.filter(({ status }) =>
      ['CONFIGURED', 'AVAILABLE'].includes(status),
    ).length,
    attention: providers.filter(
      ({ status }) => status === 'NEEDS_CONFIGURATION',
    ).length,
  };
}

function integrationIssues() {
  return integrationProviders()
    .filter(({ status }) => status === 'NEEDS_CONFIGURATION')
    .map(({ key, name }) =>
      healthIssue(
        `${key}_PROVIDER_NOT_CONFIGURED`,
        `${name} requires deployment configuration.`,
        '/app/settings/integrations',
      ),
    );
}

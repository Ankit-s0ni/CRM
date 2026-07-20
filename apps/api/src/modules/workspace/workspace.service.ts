import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeviceStatus,
  JobStatus,
  ReportType,
  TenantStatus,
  TokenPurpose,
  UserStatus,
} from '@prisma/client';
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
      const health = await this.configurationHealth(tx, tenantId, key);
      const issues = [
        ...missingDependencies.map((dependency) => ({
          code: 'MISSING_MODULE_DEPENDENCY',
          severity: 'BLOCKING',
          message: `${dependency} must be enabled before ${key} can operate.`,
          actionHref: '/app/settings/modules',
        })),
        ...health.issues,
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
          configuration: health.configuration,
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

      if (permissions.has(PERMISSIONS.DEPARTMENTS_READ)) {
        const [departments, designations, missingManager] = await Promise.all([
          tx.department.count({ where: { tenantId } }),
          tx.designation.count({ where: { tenantId } }),
          tx.employee.count({
            where: {
              tenantId,
              status: { not: 'TERMINATED' },
              managerId: null,
            },
          }),
        ]);
        categories.push(
          healthCategory(
            'ORGANIZATION',
            { departments, designations, missingManager },
            [
              ...(departments
                ? []
                : [
                    healthIssue(
                      'NO_DEPARTMENTS',
                      'Create the first department before adding employees.',
                      '/app/settings/organization',
                    ),
                  ]),
              ...(designations
                ? []
                : [
                    healthIssue(
                      'NO_DESIGNATIONS',
                      'Create the first designation before adding employees.',
                      '/app/settings/organization',
                    ),
                  ]),
              ...(missingManager
                ? [
                    healthIssue(
                      'EMPLOYEES_WITHOUT_MANAGER',
                      `${missingManager} active employees do not have a manager.`,
                      '/app/employees?quickFilter=MISSING_MANAGER',
                      missingManager,
                    ),
                  ]
                : []),
            ],
          ),
        );
      }

      if (permissions.has(PERMISSIONS.EMPLOYEES_READ)) {
        const employees = await tx.employee.count({
          where: { tenantId, status: { not: 'TERMINATED' } },
        });
        categories.push(
          healthCategory(
            'PEOPLE',
            { employees },
            employees
              ? []
              : [
                  healthIssue(
                    'NO_EMPLOYEES',
                    'Add or import the first employee after setup is ready.',
                    '/app/employees/new',
                  ),
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

      if (
        moduleKeys.has('ATTENDANCE') &&
        hasAnyPermission(permissions, [
          PERMISSIONS.ATTENDANCE_CONFIG_READ,
          PERMISSIONS.ATTENDANCE_CONFIG_MANAGE,
        ])
      ) {
        const health = await this.configurationHealth(
          tx,
          tenantId,
          'ATTENDANCE',
        );
        categories.push(
          healthCategory('ATTENDANCE', health.configuration, health.issues),
        );
      }

      if (
        moduleKeys.has('PAYROLL') &&
        hasAnyPermission(permissions, [
          PERMISSIONS.ATTENDANCE_REPORTS_READ,
          PERMISSIONS.ATTENDANCE_PAYROLL_LOCK_MANAGE,
        ])
      ) {
        const health = await this.configurationHealth(tx, tenantId, 'PAYROLL');
        categories.push(
          healthCategory('PAYROLL', health.configuration, health.issues),
        );
      }

      if (
        moduleKeys.has('ATTENDANCE') &&
        hasAnyPermission(permissions, [
          PERMISSIONS.ATTENDANCE_DEVICES_READ,
          PERMISSIONS.ATTENDANCE_SECURITY_ALERTS_READ,
          PERMISSIONS.ATTENDANCE_CONFIG_READ,
        ])
      ) {
        const [pendingDevices, alertRules, openAlerts] = await Promise.all([
          tx.registeredDevice.count({
            where: { tenantId, status: DeviceStatus.PENDING_APPROVAL },
          }),
          tx.alertRule.count({ where: { tenantId, isActive: true } }),
          tx.securityAlert.count({
            where: { tenantId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
          }),
        ]);
        categories.push(
          healthCategory(
            'SECURITY',
            { pendingDevices, alertRules, openAlerts },
            alertRules
              ? []
              : [
                  healthIssue(
                    'NO_ALERT_RULES',
                    'Review and enable the required security alert rules.',
                    '/app/attendance/security',
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

  private async configurationHealth(
    tx: Parameters<Parameters<PrismaService['forTenant']>[0]>[0],
    tenantId: string,
    key: string,
  ): Promise<{
    configuration: Record<string, number>;
    issues: SettingsHealthIssue[];
  }> {
    if (key === 'ATTENDANCE') {
      const [
        offices,
        policies,
        shifts,
        assignments,
        leavePolicies,
        leaveBalances,
      ] = await Promise.all([
        tx.officeLocation.count({ where: { tenantId } }),
        tx.attendancePolicy.count({ where: { tenantId } }),
        tx.shift.count({ where: { tenantId } }),
        tx.policyAssignment.count({ where: { tenantId } }),
        tx.leavePolicy.count({ where: { tenantId, isActive: true } }),
        tx.leaveBalance.count({ where: { tenantId } }),
      ]);
      return {
        configuration: {
          offices,
          policies,
          shifts,
          assignments,
          leavePolicies,
          leaveBalances,
        },
        issues: [
          ...(offices
            ? []
            : [
                setupIssue(
                  'NO_OFFICE',
                  'Add an office or field location rule.',
                  '/app/attendance/offices',
                ),
              ]),
          ...(policies
            ? []
            : [
                setupIssue(
                  'NO_ATTENDANCE_POLICY',
                  'Create an Attendance policy.',
                  '/app/attendance/policies',
                ),
              ]),
          ...(shifts
            ? []
            : [
                setupIssue(
                  'NO_SHIFT',
                  'Create the default working shift.',
                  '/app/attendance/shifts',
                ),
              ]),
          ...(assignments
            ? []
            : [
                setupIssue(
                  'NO_POLICY_ASSIGNMENT',
                  'Assign a tenant, department, or employee policy.',
                  '/app/attendance/policies',
                ),
              ]),
          ...(leavePolicies
            ? []
            : [
                setupIssue(
                  'NO_LEAVE_POLICY',
                  'Create a Leave policy for Attendance.',
                  '/app/attendance/setup/leave',
                ),
              ]),
        ],
      };
    }
    if (key === 'LEAVE') {
      const [activePolicies, assignedBalances] = await Promise.all([
        tx.leavePolicy.count({ where: { tenantId, isActive: true } }),
        tx.leaveBalance.count({ where: { tenantId } }),
      ]);
      return {
        configuration: { activePolicies, assignedBalances },
        issues: activePolicies
          ? []
          : [
              setupIssue(
                'NO_LEAVE_POLICY',
                'Create an active Leave policy.',
                '/app/modules/leave/policies',
              ),
            ],
      };
    }
    if (key === 'PAYROLL') {
      const [completedExports, lockedPeriods] = await Promise.all([
        tx.reportExport.count({
          where: {
            tenantId,
            reportType: ReportType.PAYROLL,
            status: JobStatus.COMPLETED,
          },
        }),
        tx.payrollLockPeriod.count({ where: { tenantId } }),
      ]);
      return {
        configuration: { completedExports, lockedPeriods },
        issues: completedExports
          ? []
          : [
              setupIssue(
                'NO_PAYROLL_EXPORT',
                'Generate a payroll export before closing a period.',
                '/app/reports/payroll',
              ),
            ],
      };
    }
    return { configuration: {}, issues: [] };
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

function hasAnyPermission(permissions: Set<string>, required: string[]) {
  return required.some((permission) => permissions.has(permission));
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
      'BIOMETRICS',
      'Face verification',
      [
        'FACE_LIVENESS_PROVIDER_URL',
        'FACE_LIVENESS_PROVIDER_TOKEN',
        'FACE_MATCH_PROVIDER_URL',
        'FACE_MATCH_PROVIDER_TOKEN',
      ],
      process.env.BIOMETRICS_ENFORCEMENT_ENABLED === 'true',
    ),
    providerDiagnostic(
      'PAYMENTS',
      'Online payments',
      ['STRIPE_CHARGE_URL', 'STRIPE_HEALTH_URL', 'STRIPE_API_KEY'],
      process.env.STRIPE_ENABLED === 'true',
    ),
    {
      key: 'MAPS',
      name: 'OpenStreetMap',
      status: 'AVAILABLE',
      message: 'Web and mobile maps use OpenStreetMap-compatible tiles.',
    },
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

function setupIssue(code: string, message: string, actionHref: string) {
  return { code, severity: 'RECOMMENDED', message, actionHref };
}

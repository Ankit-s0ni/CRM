import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AttendanceLocationMode,
  EmployeeStatus,
  Prisma,
  SelfieMode,
  TenantStatus,
  WorkType,
} from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  canEnforceBiometrics,
  mobileReleasePolicy,
} from '../../shared/config/production-runtime-config';
import { TenantAssetStorageService } from '../workspace-settings/tenant-asset-storage.service';
import { UpdateAttendanceCapabilitiesDto } from './dto/runtime-config.dto';

type RuntimeEmployee = Prisma.EmployeeGetPayload<{
  select: {
    id: true;
    fullName: true;
    workType: true;
    status: true;
    deptId: true;
    updatedAt: true;
    faceEmbeddingRef: true;
  };
}>;

type EffectivePolicy = Prisma.AttendancePolicyGetPayload<Record<string, never>>;

@Injectable()
export class RuntimeConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly assets: TenantAssetStorageService,
  ) {}

  async getForCurrentEmployee(jwtDeviceId?: string) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const resolved = await this.prisma.forTenant(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          companyName: true,
          companyLogo: true,
          status: true,
          settings: true,
        },
      });
      if (!tenant || !isAvailableTenant(tenant.status)) {
        throw new ForbiddenException({
          code:
            tenant?.status === TenantStatus.SUSPENDED
              ? 'TENANT_SUSPENDED'
              : 'WORKSPACE_UNAVAILABLE',
          message: 'This workspace is unavailable',
        });
      }
      const employee = await this.employeeForUser(tx, userId);
      const [
        moduleRows,
        policy,
        device,
        consent,
        enrollment,
        leavePolicyCount,
      ] = await Promise.all([
        tx.tenantModule.findMany({
          where: {
            tenantId,
            isActive: true,
            module: { availability: 'AVAILABLE' },
          },
          select: { module: { select: { key: true } } },
        }),
        this.effectivePolicy(tx, employee),
        jwtDeviceId
          ? tx.registeredDevice.findFirst({
              where: {
                id: jwtDeviceId,
                employeeId: employee.id,
                status: 'ACTIVE',
              },
              select: { id: true },
            })
          : Promise.resolve(null),
        tx.biometricConsent.findFirst({
          where: { employeeId: employee.id },
          orderBy: { consentedAt: 'desc' },
          select: { action: true },
        }),
        tx.faceEnrollment.findFirst({
          where: { employeeId: employee.id, status: 'ACTIVE' },
          select: { id: true },
        }),
        tx.leavePolicy.count({ where: { tenantId, isActive: true } }),
      ]);
      const settings = tenant.settings ?? defaultSettings(tenantId);
      const release = mobileReleasePolicy();
      const moduleKeys = new Set(moduleRows.map(({ module }) => module.key));
      const capabilityKeys = await this.effectiveCapabilityKeys(tx, tenantId);
      const attendanceEnabled = moduleKeys.has('ATTENDANCE');
      const locationMode =
        attendanceEnabled && capabilityKeys.has('ATTENDANCE_OFFICE_GEOFENCE')
          ? (policy?.locationMode ?? legacyLocationMode(policy))
          : AttendanceLocationMode.NONE;
      const selfieMode =
        attendanceEnabled && capabilityKeys.has('ATTENDANCE_SELFIE')
          ? (policy?.selfieMode ?? legacySelfieMode(policy))
          : SelfieMode.DISABLED;
      const fieldTrackingEnabled = isFieldTrackingEnabled({
        moduleKeys,
        capabilityKeys,
        settingsEnabled: settings.fieldTrackingEnabled,
        policy,
        workType: employee.workType,
      });
      const faceRequired = selfieMode === SelfieMode.REQUIRED;
      const registeredDeviceRequired =
        attendanceEnabled &&
        capabilityKeys.has('ATTENDANCE_DEVICE_TRUST') &&
        (policy?.requireRegisteredDevice ?? true);
      const biometricConsentRequired =
        faceRequired && policy?.allowBiometricOptOut !== true;
      return {
        objectKey: settings.companyLogoKey,
        legacyLogoUrl: safeLegacyLogo(tenant.companyLogo),
        etagSeed: `${settings.runtimeConfigVersion}:${employee.updatedAt.getTime()}:${policy?.updatedAt.getTime() ?? 0}:${release.minimumVersion}:${release.recommendedVersion}`,
        data: {
          configVersion: settings.runtimeConfigVersion,
          product: { name: 'DeltCRM', logoUrl: null },
          release,
          tenant: {
            id: tenant.id,
            name: tenant.companyName,
            logoUrl: null as string | null,
            timezone: settings.timezone,
            locale: settings.locale,
          },
          employee: {
            id: employee.id,
            displayName: employee.fullName,
            workType: employee.workType,
            status: employee.status,
          },
          modules: {
            attendance: { enabled: attendanceEnabled },
            fieldTracking: { enabled: fieldTrackingEnabled },
            regularization: {
              enabled: capabilityKeys.has('ATTENDANCE_REGULARIZATION'),
            },
            // Kept for older mobile builds; Leave is included with Attendance.
            leave: { enabled: attendanceEnabled },
          },
          attendance: {
            canPunch: attendanceEnabled,
            locationMode,
            selfieMode,
            registeredDeviceRequired,
            integrityRequired: attendanceEnabled,
            maxOfflineSyncHours: policy?.maxOfflineSyncHours ?? 48,
            leave: {
              enabled: attendanceEnabled,
              policyCount: leavePolicyCount,
              canRequest: attendanceEnabled && leavePolicyCount > 0,
            },
          },
          fieldTracking: {
            enabled: fieldTrackingEnabled,
            intervalMinutes: fieldTrackingEnabled
              ? settings.fieldTrackingIntervalMin
              : null,
          },
          onboarding: {
            deviceRegistrationRequired: registeredDeviceRequired,
            deviceRegistrationComplete: !registeredDeviceRequired || !!device,
            locationPermissionRequired:
              locationMode !== AttendanceLocationMode.NONE ||
              fieldTrackingEnabled,
            biometricConsentRequired,
            biometricConsentComplete:
              !biometricConsentRequired || consent?.action === 'GRANTED',
            faceEnrollmentRequired: faceRequired,
            faceEnrollmentComplete:
              !faceRequired || !!enrollment || !!employee.faceEmbeddingRef,
          },
        },
      };
    });

    let logoUrl = resolved.legacyLogoUrl;
    if (resolved.objectKey) {
      try {
        logoUrl = await this.assets.signedLogoUrl(tenantId, resolved.objectKey);
      } catch {
        logoUrl = null;
      }
    }
    resolved.data.tenant.logoUrl = logoUrl;
    return { data: resolved.data, etag: `W/"${resolved.etagSeed}"` };
  }

  async getAttendanceCapabilities() {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const [settings, modules, capabilityKeys] = await Promise.all([
        tx.tenantSettings.findUnique({ where: { tenantId } }),
        tx.tenantModule.findMany({
          where: {
            tenantId,
            isActive: true,
            module: { availability: 'AVAILABLE' },
          },
          select: { module: { select: { key: true } } },
        }),
        this.effectiveCapabilityKeys(tx, tenantId),
      ]);
      const keys = new Set(modules.map(({ module }) => module.key));
      const fieldTrackingEntitled =
        keys.has('FIELD_TRACKING') &&
        capabilityKeys.has('ATTENDANCE_FIELD_TRACKING');
      const fieldTrackingEnabled = settings?.fieldTrackingEnabled ?? false;
      const fieldTrackingRelevant =
        fieldTrackingEntitled && fieldTrackingEnabled
          ? await this.hasRelevantFieldTrackingEmployee(tx, tenantId)
          : false;
      return {
        data: {
          attendanceEntitled: keys.has('ATTENDANCE'),
          officeGeofenceEntitled: capabilityKeys.has(
            'ATTENDANCE_OFFICE_GEOFENCE',
          ),
          deviceTrustEntitled: capabilityKeys.has('ATTENDANCE_DEVICE_TRUST'),
          selfieEntitled: capabilityKeys.has('ATTENDANCE_SELFIE'),
          regularizationEntitled: capabilityKeys.has(
            'ATTENDANCE_REGULARIZATION',
          ),
          payrollExportEntitled: capabilityKeys.has(
            'ATTENDANCE_PAYROLL_EXPORT',
          ),
          fieldTrackingEntitled,
          fieldTrackingEnabled,
          fieldTrackingRelevant,
          fieldTrackingIntervalMin: settings?.fieldTrackingIntervalMin ?? 15,
          biometricEnforcementAvailable: canEnforceBiometrics(),
          runtimeConfigVersion: settings?.runtimeConfigVersion ?? 1,
        },
      };
    });
  }

  private async hasRelevantFieldTrackingEmployee(
    tx: PrismaTransaction,
    tenantId: string,
  ) {
    const employees = await tx.employee.findMany({
      where: {
        tenantId,
        status: EmployeeStatus.ACTIVE,
        workType: { in: [WorkType.FIELD, WorkType.HYBRID] },
      },
      select: { id: true, deptId: true, workType: true },
    });
    if (!employees.length) return false;

    const employeeIds = employees.map(({ id }) => id);
    const departmentIds = [...new Set(employees.map(({ deptId }) => deptId))];
    const assignments = await tx.policyAssignment.findMany({
      where: {
        tenantId,
        OR: [
          { scope: 'EMPLOYEE', employeeId: { in: employeeIds } },
          { scope: 'DEPARTMENT', deptId: { in: departmentIds } },
          { scope: 'TENANT_DEFAULT' },
        ],
      },
      select: {
        scope: true,
        employeeId: true,
        deptId: true,
        policy: {
          select: {
            fieldTrackingEnabled: true,
            allowHybridFieldTracking: true,
          },
        },
      },
    });

    return employees.some((employee) => {
      const policy =
        assignments.find(
          (assignment) =>
            assignment.scope === 'EMPLOYEE' &&
            assignment.employeeId === employee.id,
        )?.policy ??
        assignments.find(
          (assignment) =>
            assignment.scope === 'DEPARTMENT' &&
            assignment.deptId === employee.deptId,
        )?.policy ??
        assignments.find((assignment) => assignment.scope === 'TENANT_DEFAULT')
          ?.policy;
      return Boolean(
        policy?.fieldTrackingEnabled &&
        (employee.workType === WorkType.FIELD ||
          policy.allowHybridFieldTracking),
      );
    });
  }

  private async effectiveCapabilityKeys(
    tx: PrismaTransaction,
    tenantId: string,
  ) {
    const now = new Date();
    const [subscription, overrides] = await Promise.all([
      tx.tenantSubscription.findFirst({
        where: {
          tenantId,
          status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
        },
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
        where: {
          tenantId,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
        },
        include: { capability: true },
      }),
    ]);
    const keys = new Set(
      subscription?.plan.capabilities
        .filter(({ included }) => included)
        .map(({ capability }) => capability.key) ?? [],
    );
    for (const override of overrides) {
      if (override.mode === 'ENABLE') keys.add(override.capability.key);
      if (override.mode === 'DISABLE') keys.delete(override.capability.key);
    }
    return keys;
  }

  updateAttendanceCapabilities(dto: UpdateAttendanceCapabilitiesDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'At least one attendance capability must be provided',
      });
    }
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      if (dto.fieldTrackingEnabled === true) {
        const [entitledModule, capabilityKeys] = await Promise.all([
          tx.tenantModule.findFirst({
            where: {
              tenantId,
              isActive: true,
              module: { key: 'FIELD_TRACKING', availability: 'AVAILABLE' },
            },
            select: { id: true },
          }),
          this.effectiveCapabilityKeys(tx, tenantId),
        ]);
        if (
          !entitledModule ||
          !capabilityKeys.has('ATTENDANCE_FIELD_TRACKING')
        ) {
          throw new ForbiddenException({
            code: 'MODULE_ACCESS_DENIED',
            message:
              'Field Tracking is not included in this workspace subscription',
          });
        }
      }
      const previous = await tx.tenantSettings.findUnique({
        where: { tenantId },
      });
      const settings = await tx.tenantSettings.upsert({
        where: { tenantId },
        create: { tenantId, ...dto, runtimeConfigVersion: 2 },
        update: {
          ...dto,
          runtimeConfigVersion: { increment: 1 },
        },
      });
      if (dto.fieldTrackingEnabled === false) {
        await tx.fieldTrackingSession.updateMany({
          where: { tenantId, endedAt: null },
          data: { endedAt: new Date(), endReason: 'ADMINISTRATOR' },
        });
      }
      await this.audit.append(tx, {
        tenantId,
        action: 'workspace.attendance_capabilities.updated',
        module: 'ATTENDANCE',
        entityType: 'TenantSettings',
        entityId: tenantId,
        oldValue: previous,
        newValue: settings,
      });
      await this.outbox.append(tx, {
        tenantId,
        eventKey: 'tenant.runtime-config.changed.v1',
        payload: {
          tenantId,
          runtimeConfigVersion: settings.runtimeConfigVersion,
          changed: Object.keys(dto),
        },
      });
      return { data: settings };
    });
  }

  async assertFieldTrackingEnabled(
    tx: PrismaTransaction,
    userId = this.requireUserId(),
  ) {
    const employee = await this.employeeForUser(tx, userId);
    const [policy, settings, modules, capabilityKeys] = await Promise.all([
      this.effectivePolicy(tx, employee),
      tx.tenantSettings.findUnique({ where: { tenantId: employee.tenantId } }),
      tx.tenantModule.findMany({
        where: {
          tenantId: employee.tenantId,
          isActive: true,
          module: { key: 'FIELD_TRACKING', availability: 'AVAILABLE' },
        },
        select: { module: { select: { key: true } } },
      }),
      this.effectiveCapabilityKeys(tx, employee.tenantId),
    ]);
    const enabled = isFieldTrackingEnabled({
      moduleKeys: new Set(modules.map(({ module }) => module.key)),
      capabilityKeys,
      settingsEnabled: settings?.fieldTrackingEnabled ?? false,
      policy,
      workType: employee.workType,
    });
    if (!enabled) {
      await tx.fieldTrackingSession.updateMany({
        where: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          endedAt: null,
        },
        data: { endedAt: new Date(), endReason: 'ADMINISTRATOR' },
      });
      throw new ForbiddenException({
        code:
          employee.workType === WorkType.OFFICE
            ? 'FIELD_TRACKING_NOT_ELIGIBLE'
            : 'CAPABILITY_NOT_ENABLED',
        message: 'Field tracking is not enabled for this employee',
      });
    }
    return employee;
  }

  private async employeeForUser(tx: PrismaTransaction, userId: string) {
    const employee = await tx.employee.findFirst({
      where: { userId },
      select: {
        id: true,
        tenantId: true,
        fullName: true,
        workType: true,
        status: true,
        deptId: true,
        updatedAt: true,
        faceEmbeddingRef: true,
      },
    });
    if (!employee || employee.status !== EmployeeStatus.ACTIVE) {
      throw new ForbiddenException({
        code: 'EMPLOYEE_NOT_ACTIVE',
        message: 'An active employee profile is required',
      });
    }
    return employee;
  }

  private async effectivePolicy(
    tx: PrismaTransaction,
    employee: Pick<RuntimeEmployee, 'id' | 'deptId'>,
  ): Promise<EffectivePolicy | null> {
    const assignments = await tx.policyAssignment.findMany({
      where: {
        tenantId: this.requireTenantId(),
        OR: [
          { scope: 'EMPLOYEE', employeeId: employee.id },
          { scope: 'DEPARTMENT', deptId: employee.deptId },
          { scope: 'TENANT_DEFAULT' },
        ],
      },
      include: { policy: true },
    });
    return (
      assignments.find(({ scope }) => scope === 'EMPLOYEE')?.policy ??
      assignments.find(({ scope }) => scope === 'DEPARTMENT')?.policy ??
      assignments.find(({ scope }) => scope === 'TENANT_DEFAULT')?.policy ??
      null
    );
  }

  private requireTenantId() {
    if (!this.context.tenantId) {
      throw new ServiceUnavailableException({
        code: 'RUNTIME_CONFIG_UNAVAILABLE',
        message: 'Tenant context is unavailable',
      });
    }
    return this.context.tenantId;
  }

  private requireUserId() {
    if (!this.context.userId) {
      throw new ServiceUnavailableException({
        code: 'RUNTIME_CONFIG_UNAVAILABLE',
        message: 'Authenticated employee context is unavailable',
      });
    }
    return this.context.userId;
  }
}

function isAvailableTenant(status: TenantStatus) {
  return status === TenantStatus.ACTIVE || status === TenantStatus.TRIAL;
}

function defaultSettings(tenantId: string) {
  return {
    tenantId,
    timezone: 'Asia/Kolkata',
    locale: 'en',
    fieldTrackingEnabled: false,
    fieldTrackingIntervalMin: 15,
    runtimeConfigVersion: 1,
    companyLogoKey: null,
  };
}

function legacyLocationMode(policy: EffectivePolicy | null) {
  return policy?.requireGeofence === false
    ? AttendanceLocationMode.NONE
    : AttendanceLocationMode.OFFICE_GEOFENCE;
}

function legacySelfieMode(policy: EffectivePolicy | null) {
  return policy?.requireFaceMatch ? SelfieMode.REQUIRED : SelfieMode.DISABLED;
}

function isFieldTrackingEnabled(input: {
  moduleKeys: Set<string>;
  capabilityKeys: Set<string>;
  settingsEnabled: boolean;
  policy: EffectivePolicy | null;
  workType: WorkType;
}) {
  if (
    !input.moduleKeys.has('FIELD_TRACKING') ||
    !input.capabilityKeys.has('ATTENDANCE_FIELD_TRACKING') ||
    !input.settingsEnabled ||
    input.policy?.fieldTrackingEnabled !== true
  ) {
    return false;
  }
  return (
    input.workType === WorkType.FIELD ||
    (input.workType === WorkType.HYBRID &&
      input.policy.allowHybridFieldTracking === true)
  );
}

function safeLegacyLogo(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

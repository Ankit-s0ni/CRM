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
      const [moduleRows, policy, device, consent, enrollment] =
        await Promise.all([
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
            : tx.registeredDevice.findFirst({
                where: { employeeId: employee.id, status: 'ACTIVE' },
                select: { id: true },
              }),
          tx.biometricConsent.findFirst({
            where: { employeeId: employee.id },
            orderBy: { consentedAt: 'desc' },
            select: { action: true },
          }),
          tx.faceEnrollment.findFirst({
            where: { employeeId: employee.id, status: 'ACTIVE' },
            select: { id: true },
          }),
        ]);
      const settings = tenant.settings ?? defaultSettings(tenantId);
      const release = mobileReleasePolicy();
      const moduleKeys = new Set(moduleRows.map(({ module }) => module.key));
      const attendanceEnabled = moduleKeys.has('ATTENDANCE');
      const locationMode = attendanceEnabled
        ? (policy?.locationMode ?? legacyLocationMode(policy))
        : AttendanceLocationMode.NONE;
      const selfieMode = attendanceEnabled
        ? (policy?.selfieMode ?? legacySelfieMode(policy))
        : SelfieMode.DISABLED;
      const fieldTrackingEnabled = isFieldTrackingEnabled({
        moduleKeys,
        settingsEnabled: settings.fieldTrackingEnabled,
        policy,
        workType: employee.workType,
      });
      const faceRequired = selfieMode === SelfieMode.REQUIRED;
      const registeredDeviceRequired =
        attendanceEnabled && (policy?.requireRegisteredDevice ?? true);
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
            regularization: { enabled: moduleKeys.has('REGULARIZATION') },
            leave: { enabled: moduleKeys.has('LEAVE') },
          },
          attendance: {
            canPunch: attendanceEnabled,
            locationMode,
            selfieMode,
            registeredDeviceRequired,
            integrityRequired: attendanceEnabled,
            maxOfflineSyncHours: policy?.maxOfflineSyncHours ?? 48,
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

  getAttendanceCapabilities() {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const [settings, modules] = await Promise.all([
        tx.tenantSettings.findUnique({ where: { tenantId } }),
        tx.tenantModule.findMany({
          where: {
            tenantId,
            isActive: true,
            module: { availability: 'AVAILABLE' },
          },
          select: { module: { select: { key: true } } },
        }),
      ]);
      const keys = new Set(modules.map(({ module }) => module.key));
      return {
        data: {
          attendanceEntitled: keys.has('ATTENDANCE'),
          fieldTrackingEntitled: keys.has('FIELD_TRACKING'),
          fieldTrackingEnabled: settings?.fieldTrackingEnabled ?? false,
          fieldTrackingIntervalMin: settings?.fieldTrackingIntervalMin ?? 15,
          biometricEnforcementAvailable: canEnforceBiometrics(),
          runtimeConfigVersion: settings?.runtimeConfigVersion ?? 1,
        },
      };
    });
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
        const entitled = await tx.tenantModule.findFirst({
          where: {
            tenantId,
            isActive: true,
            module: { key: 'FIELD_TRACKING', availability: 'AVAILABLE' },
          },
          select: { id: true },
        });
        if (!entitled) {
          throw new ForbiddenException({
            code: 'MODULE_ACCESS_DENIED',
            message: 'FIELD_TRACKING is not active for this workspace',
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
    const [policy, settings, modules] = await Promise.all([
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
    ]);
    const enabled = isFieldTrackingEnabled({
      moduleKeys: new Set(modules.map(({ module }) => module.key)),
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
  settingsEnabled: boolean;
  policy: EffectivePolicy | null;
  workType: WorkType;
}) {
  if (
    !input.moduleKeys.has('FIELD_TRACKING') ||
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

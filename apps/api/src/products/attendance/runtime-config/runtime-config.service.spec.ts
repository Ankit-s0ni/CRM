import {
  AttendanceLocationMode,
  EmployeeStatus,
  SelfieMode,
  TenantStatus,
  WorkType,
} from '@prisma/client';
import type { AuditService } from '../../../platform/audit/public';
import type {
  PrismaService,
  PrismaTransaction,
} from '../../../shared/database/prisma.service';
import type { OutboxService } from '../../../shared/events/outbox.service';
import type { TenantContextService } from '../../../platform/tenancy/public';
import type { TenantAssetStorageService } from '../../../platform/workspace/public';
import { RuntimeConfigService } from './runtime-config.service';

const tenantId = '10000000-0000-4000-8000-000000000001';
const userId = '20000000-0000-4000-8000-000000000001';
const employeeId = '30000000-0000-4000-8000-000000000001';

describe('RuntimeConfigService', () => {
  it('projects location-only office attendance without biometric data', async () => {
    const fixture = createFixture({
      modules: ['ATTENDANCE'],
      policy: policy({
        locationMode: AttendanceLocationMode.OFFICE_GEOFENCE,
        selfieMode: SelfieMode.DISABLED,
      }),
    });

    const result = await fixture.service.getForCurrentEmployee();

    expect(result.data).toMatchObject({
      product: { name: 'DeltCRM' },
      release: {
        minimumVersion: '1.0.0',
        recommendedVersion: '1.0.0',
      },
      tenant: { id: tenantId, name: 'Acme Logistics' },
      modules: {
        attendance: { enabled: true },
        fieldTracking: { enabled: false },
      },
      attendance: {
        canPunch: true,
        locationMode: AttendanceLocationMode.OFFICE_GEOFENCE,
        selfieMode: SelfieMode.DISABLED,
        leave: { enabled: true, policyCount: 0, canRequest: false },
      },
      onboarding: {
        locationPermissionRequired: true,
        biometricConsentRequired: false,
        faceEnrollmentRequired: false,
      },
    });
    expect(JSON.stringify(result.data)).not.toContain('faceEmbeddingRef');
    expect(JSON.stringify(result.data)).not.toContain('officeAssignments');
  });

  it('enables field tracking only across entitlement, tenant, policy and work type', async () => {
    const fixture = createFixture({
      modules: ['ATTENDANCE', 'FIELD_TRACKING'],
      fieldTrackingEnabled: true,
      workType: WorkType.FIELD,
      policy: policy({
        locationMode: AttendanceLocationMode.FIELD_GPS,
        fieldTrackingEnabled: true,
      }),
    });

    await expect(
      fixture.service.getForCurrentEmployee(),
    ).resolves.toMatchObject({
      data: {
        modules: { fieldTracking: { enabled: true } },
        fieldTracking: { enabled: true, intervalMinutes: 15 },
      },
    });
  });

  it('does not treat another active device as the current installation', async () => {
    const deviceId = '60000000-0000-4000-8000-000000000001';
    const fixture = createFixture({ modules: ['ATTENDANCE'] });
    fixture.findDevice.mockResolvedValue({ id: deviceId });

    const unbound = await fixture.service.getForCurrentEmployee();
    expect(unbound.data.onboarding.deviceRegistrationComplete).toBe(false);
    expect(fixture.findDevice).not.toHaveBeenCalled();

    const bound = await fixture.service.getForCurrentEmployee(deviceId);
    expect(bound.data.onboarding.deviceRegistrationComplete).toBe(true);
    expect(fixture.findDevice).toHaveBeenCalledWith({
      where: { id: deviceId, employeeId, status: 'ACTIVE' },
      select: { id: true },
    });
  });

  it('fails before returning tenant data for an inactive employee', async () => {
    const fixture = createFixture({
      employeeStatus: EmployeeStatus.TERMINATED,
    });

    await expect(fixture.service.getForCurrentEmployee()).rejects.toMatchObject(
      {
        response: { code: 'EMPLOYEE_NOT_ACTIVE' },
      },
    );
  });
});

function createFixture(input: {
  modules?: string[];
  fieldTrackingEnabled?: boolean;
  workType?: WorkType;
  employeeStatus?: EmployeeStatus;
  policy?: ReturnType<typeof policy> | null;
}) {
  const modules = input.modules ?? ['ATTENDANCE'];
  const capabilityKeys = [
    'ATTENDANCE_CORE',
    'ATTENDANCE_OFFICE_GEOFENCE',
    'ATTENDANCE_DEVICE_TRUST',
    'ATTENDANCE_SELFIE',
    'ATTENDANCE_REGULARIZATION',
    ...(modules.includes('FIELD_TRACKING')
      ? ['ATTENDANCE_FIELD_TRACKING']
      : []),
  ];
  const findDevice = jest.fn().mockResolvedValue(null);
  const tx = {
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        id: tenantId,
        companyName: 'Acme Logistics',
        companyLogo: 'javascript:alert(1)',
        status: TenantStatus.ACTIVE,
        settings: {
          tenantId,
          timezone: 'Asia/Dubai',
          locale: 'en-AE',
          fieldTrackingEnabled: input.fieldTrackingEnabled ?? false,
          fieldTrackingIntervalMin: 15,
          runtimeConfigVersion: 7,
          companyLogoKey: null,
        },
      }),
    },
    employee: {
      findFirst: jest.fn().mockResolvedValue({
        id: employeeId,
        tenantId,
        fullName: 'Aisha Employee',
        workType: input.workType ?? WorkType.OFFICE,
        status: input.employeeStatus ?? EmployeeStatus.ACTIVE,
        deptId: '40000000-0000-4000-8000-000000000001',
        updatedAt: new Date('2026-07-18T00:00:00Z'),
        faceEmbeddingRef: 'private-face-template',
      }),
    },
    tenantModule: {
      findMany: jest
        .fn()
        .mockResolvedValue(modules.map((key) => ({ module: { key } }))),
    },
    tenantSubscription: {
      findFirst: jest.fn().mockResolvedValue({
        plan: {
          capabilities: capabilityKeys.map((key) => ({
            included: true,
            capability: { key },
          })),
        },
      }),
    },
    tenantCapabilityOverride: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    policyAssignment: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          input.policy === null
            ? []
            : [{ scope: 'TENANT_DEFAULT', policy: input.policy ?? policy() }],
        ),
    },
    registeredDevice: { findFirst: findDevice },
    biometricConsent: { findFirst: jest.fn().mockResolvedValue(null) },
    faceEnrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    leavePolicy: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaTransaction;
  const prisma = {
    forTenant: (callback: (transaction: PrismaTransaction) => unknown) =>
      callback(tx),
  } as unknown as PrismaService;
  const context = { tenantId, userId } as TenantContextService;
  const service = new RuntimeConfigService(
    prisma,
    context,
    {} as AuditService,
    {} as OutboxService,
    { signedLogoUrl: jest.fn() } as unknown as TenantAssetStorageService,
  );
  return { service, findDevice };
}

function policy(
  overrides: Partial<{
    locationMode: AttendanceLocationMode;
    selfieMode: SelfieMode;
    fieldTrackingEnabled: boolean;
  }> = {},
) {
  return {
    id: '50000000-0000-4000-8000-000000000001',
    tenantId,
    name: 'Default policy',
    lateAfterMinutes: 15,
    halfDayAfterMinutes: 240,
    minimumWorkMinutes: 480,
    overtimeAfterMinutes: 540,
    allowEarlyCheckin: true,
    allowEarlyCheckout: false,
    requireFaceMatch: false,
    allowBiometricOptOut: false,
    requireRegisteredDevice: true,
    requireGeofence: true,
    locationMode: AttendanceLocationMode.OFFICE_GEOFENCE,
    selfieMode: SelfieMode.DISABLED,
    fieldTrackingEnabled: false,
    allowHybridFieldTracking: false,
    maxOfflineSyncHours: 48,
    maxFaceAttempts: 3,
    weeklyOffs: null,
    breakRules: {},
    createdAt: new Date('2026-07-18T00:00:00Z'),
    updatedAt: new Date('2026-07-18T00:00:00Z'),
    ...overrides,
  };
}

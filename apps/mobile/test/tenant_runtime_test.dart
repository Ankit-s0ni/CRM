import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/network/network_providers.dart';
import 'package:hrms_attendance/core/tenant/tenant_config.dart';
import 'package:hrms_attendance/core/tenant/tenant_controller.dart';

import 'support/test_api_service.dart';

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  test('loads and securely caches an office location-only runtime', () async {
    final localData = _TenantLocalDataService();
    final container = ProviderContainer(
      overrides: [
        tenantLocalDataServiceProvider.overrideWithValue(localData),
        apiServiceProvider.overrideWithValue(
          createTestApiService(
            runtime: testRuntimeConfig(
              locationMode: 'OFFICE_GEOFENCE',
              selfieMode: 'DISABLED',
              fieldTracking: false,
            ),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);

    await container.read(tenantControllerProvider.notifier).loadRuntime();
    final tenant = container.read(tenantControllerProvider);

    expect(tenant.runtimeLoaded, isTrue);
    expect(tenant.branding.companyName, 'Acme Logistics');
    expect(tenant.branding.productName, 'DeltCRM');
    expect(
      tenant.attendancePolicy.locationMode,
      AttendanceLocationMode.officeGeofence,
    );
    expect(tenant.attendancePolicy.selfieMode, AttendanceSelfieMode.disabled);
    expect(tenant.hasModule(TenantModule.fieldTracking), isFalse);
    expect(tenant.onboarding.biometricConsentRequired, isFalse);

    final cached = await container
        .read(tenantRuntimeRepositoryProvider)
        .readCached();
    expect(cached?.tenantId, tenant.tenantId);
    expect(cached?.configVersion, 7);
    final secureValues = await const FlutterSecureStorage().readAll();
    final cacheKey =
        secureValues['deltcrm.runtime.${const String.fromEnvironment('WORKSPACE_SUBDOMAIN', defaultValue: 'acme')}.current'];
    expect(cacheKey, contains(tenant.tenantId));
    expect(cacheKey, contains(tenant.employeeId));
    expect(cacheKey, endsWith('.7'));

    await container.read(tenantControllerProvider.notifier).clearRuntime();
    expect(localData.clearCalls, 1);
    final clearedValues = await const FlutterSecureStorage().readAll();
    expect(clearedValues[cacheKey], isNull);
    expect(
      clearedValues.keys.where((key) => key.endsWith('.current')),
      isEmpty,
    );
  });

  test('projects field and attendance-disabled tenant variants', () async {
    for (final fixture in [
      (
        runtime: testRuntimeConfig(
          fieldTracking: true,
          locationMode: 'FIELD_GPS',
        ),
        attendance: true,
        field: true,
      ),
      (
        runtime: testRuntimeConfig(
          attendance: false,
          regularization: false,
          locationMode: 'NONE',
        ),
        attendance: false,
        field: false,
      ),
    ]) {
      FlutterSecureStorage.setMockInitialValues({});
      final container = ProviderContainer(
        overrides: [
          apiServiceProvider.overrideWithValue(
            createTestApiService(runtime: fixture.runtime),
          ),
        ],
      );
      await container.read(tenantControllerProvider.notifier).loadRuntime();
      final tenant = container.read(tenantControllerProvider);
      expect(tenant.attendancePolicy.canPunch, fixture.attendance);
      expect(tenant.hasModule(TenantModule.fieldTracking), fixture.field);
      container.dispose();
    }
  });

  test('projects Leave from the Attendance capability contract', () async {
    final container = ProviderContainer(
      overrides: [
        apiServiceProvider.overrideWithValue(
          createTestApiService(runtime: testRuntimeConfig(leave: true)),
        ),
      ],
    );
    addTearDown(container.dispose);

    await container.read(tenantControllerProvider.notifier).loadRuntime();

    expect(
      container.read(tenantControllerProvider).hasModule(TenantModule.leave),
      isTrue,
    );
  });

  test('keeps Leave visible while HR policy setup is pending', () async {
    final container = ProviderContainer(
      overrides: [
        apiServiceProvider.overrideWithValue(
          createTestApiService(runtime: testRuntimeConfig(leave: false)),
        ),
      ],
    );
    addTearDown(container.dispose);

    await container.read(tenantControllerProvider.notifier).loadRuntime();

    expect(
      container.read(tenantControllerProvider).hasModule(TenantModule.leave),
      isTrue,
    );
  });

  test(
    'location-only policy ignores stale biometric onboarding flags',
    () async {
      final runtime = testRuntimeConfig(
        locationMode: 'OFFICE_GEOFENCE',
        selfieMode: 'DISABLED',
      );
      final onboarding = runtime['onboarding']! as Map<String, dynamic>;
      onboarding
        ..['biometricConsentRequired'] = true
        ..['biometricConsentComplete'] = false
        ..['faceEnrollmentRequired'] = true
        ..['faceEnrollmentComplete'] = false;
      final container = ProviderContainer(
        overrides: [
          apiServiceProvider.overrideWithValue(
            createTestApiService(runtime: runtime),
          ),
        ],
      );
      addTearDown(container.dispose);

      await container.read(tenantControllerProvider.notifier).loadRuntime();
      final controller = container.read(tenantControllerProvider.notifier);

      expect(controller.nextRequiredRoute(), '/permissions');
      expect(controller.nextAfterPermissions(), '/home');
    },
  );
}

class _TenantLocalDataService implements TenantLocalDataService {
  int clearCalls = 0;

  @override
  Future<void> clear() async {
    clearCalls += 1;
  }

  @override
  Future<void> stopFieldSession() async {}
}

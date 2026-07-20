import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/network/token_store.dart';
import 'package:hrms_attendance/core/tenant/tenant_config.dart';
import 'package:hrms_attendance/core/tenant/tenant_controller.dart';
import 'package:hrms_attendance/features/profile/domain/profile_repository.dart';
import 'package:hrms_attendance/features/profile/presentation/profile_controller.dart';

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  test(
    'profile cache is reloaded when the authenticated employee changes',
    () async {
      final repository = _ProfileRepository();
      final container = ProviderContainer(
        overrides: [
          tenantControllerProvider.overrideWith(_MutableTenantController.new),
          profileRepositoryProvider.overrideWithValue(repository),
        ],
      );
      addTearDown(container.dispose);

      final tenant =
          container.read(tenantControllerProvider.notifier)
              as _MutableTenantController;
      tenant.use(_tenant('tenant-a', 'employee-a'));
      expect(await container.read(profileControllerProvider.future), {
        'employee': 'employee-1',
      });

      tenant.use(_tenant('tenant-b', 'employee-b'));
      expect(await container.read(profileControllerProvider.future), {
        'employee': 'employee-2',
      });
      expect(repository.loads, 2);
    },
  );

  test(
    'session clearing removes refresh token and workspace identity',
    () async {
      final store = TokenStore(const FlutterSecureStorage());
      await store.writeRefreshToken('tenant-a-refresh');
      await store.writeWorkspaceSubdomain('tenant-a');

      await store.clear();

      expect(await store.readRefreshToken(), isNull);
      expect(await store.readWorkspaceSubdomain(), isNull);
    },
  );
}

class _MutableTenantController extends TenantController {
  @override
  TenantConfig build() => _tenant('', '');

  void use(TenantConfig config) => state = config;
}

class _ProfileRepository implements ProfileRepository {
  int loads = 0;

  @override
  Future<Map<String, dynamic>> load() async {
    loads += 1;
    return {'employee': 'employee-$loads'};
  }
}

TenantConfig _tenant(String tenantId, String employeeId) => TenantConfig(
  tenantId: tenantId,
  environment: 'test',
  branding: const TenantBranding(
    companyName: 'Test tenant',
    productName: 'DeltCRM',
    primaryColor: Colors.black,
  ),
  locale: const Locale('en'),
  timezone: 'UTC',
  currencyCode: 'USD',
  countryCode: 'US',
  weekendDays: const {6, 7},
  modules: const {TenantModule.attendance},
  attendancePolicy: const AttendancePolicyConfig(
    name: 'Test policy',
    workMode: WorkMode.office,
    shiftStart: TimeOfDay(hour: 9, minute: 0),
    shiftEnd: TimeOfDay(hour: 18, minute: 0),
    graceMinutes: 0,
    minimumWorkMinutes: 480,
    geofenceRadiusMeters: 100,
    locationAccuracyMeters: 30,
    locationMode: AttendanceLocationMode.officeGeofence,
    selfieMode: AttendanceSelfieMode.disabled,
    requiresRegisteredDevice: false,
    integrityRequired: false,
    canPunch: true,
    trackingIntervalMinutes: 15,
  ),
  supportEmail: 'support@example.com',
  configVersion: 1,
  runtimeLoaded: tenantId.isNotEmpty,
  employeeId: employeeId,
  employeeName: employeeId,
  onboarding: const TenantOnboarding(),
  release: const MobileReleasePolicy(
    currentVersion: '1.0.0',
    minimumVersion: '1.0.0',
    recommendedVersion: '1.0.0',
  ),
);

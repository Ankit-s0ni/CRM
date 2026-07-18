import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../background/mobile_background_tasks.dart';
import '../config/app_config.dart';
import '../network/network_providers.dart';
import '../storage/mobile_queue_repository.dart';
import 'tenant_config.dart';
import 'tenant_runtime_repository.dart';

final tenantRuntimeRepositoryProvider = Provider<TenantRuntimeRepository>(
  (ref) => TenantRuntimeRepository(
    ref.watch(apiServiceProvider),
    const FlutterSecureStorage(),
  ),
);

final tenantLocalDataServiceProvider = Provider<TenantLocalDataService>(
  (ref) => const TenantLocalDataService(),
);

final tenantControllerProvider =
    NotifierProvider<TenantController, TenantConfig>(TenantController.new);

class TenantLocalDataService {
  const TenantLocalDataService();

  Future<void> clear() async {
    await (await MobileQueueRepository.open()).clearTenantData();
  }

  Future<void> stopFieldSession() async {
    await (await MobileQueueRepository.open()).stopSession();
  }
}

class TenantController extends Notifier<TenantConfig> {
  @override
  TenantConfig build() => _publicConfig(localRuntime: AppConfig.localMode);

  Future<void> loadRuntime({bool allowCachedFallback = true}) async {
    final repository = ref.read(tenantRuntimeRepositoryProvider);
    try {
      final next = AppConfig.localMode
          ? _localConfig()
          : await repository.fetch();
      await _apply(next);
    } catch (_) {
      final cached = allowCachedFallback && !AppConfig.localMode
          ? await repository.readCached()
          : null;
      if (cached == null) rethrow;
      await _apply(cached);
    }
  }

  Future<void> refreshRuntime() => loadRuntime(allowCachedFallback: false);

  Future<void> clearRuntime() async {
    await MobileBackgroundTasks.cancelTracking();
    await ref.read(tenantLocalDataServiceProvider).clear();
    await ref.read(tenantRuntimeRepositoryProvider).clear();
    state = _publicConfig();
  }

  String nextRequiredRoute() {
    final required = state.onboarding;
    if (required.devicePending) return '/device-registration';
    if (required.locationPermissionPending) return '/permissions';
    if (required.consentPending) return '/biometric-consent';
    if (required.enrollmentPending) return '/face-enrollment';
    return '/home';
  }

  String nextAfterPermissions() {
    final required = state.onboarding;
    if (required.consentPending) return '/biometric-consent';
    if (required.enrollmentPending) return '/face-enrollment';
    return '/home';
  }

  void setLocale(Locale locale) {
    if (!const [Locale('en'), Locale('ar')].contains(locale)) return;
    state = state.copyWith(locale: locale);
  }

  Future<void> _apply(TenantConfig next) async {
    final fieldWasEnabled = state.hasModule(TenantModule.fieldTracking);
    state = next;
    if (fieldWasEnabled && !next.hasModule(TenantModule.fieldTracking)) {
      await MobileBackgroundTasks.cancelTracking();
      await ref.read(tenantLocalDataServiceProvider).stopFieldSession();
    }
  }
}

TenantConfig _publicConfig({bool localRuntime = false}) => TenantConfig(
  tenantId: '',
  environment: AppConfig.environment,
  branding: TenantBranding(
    companyName: 'DeltCRM',
    productName: 'Workforce Management',
    primaryColor: AppConfig.brandColor,
  ),
  locale: const Locale('en'),
  timezone: 'UTC',
  currencyCode: AppConfig.currencyCode,
  countryCode: AppConfig.countryCode,
  weekendDays: const {5, 6},
  modules: const {},
  attendancePolicy: const AttendancePolicyConfig(
    name: 'Runtime configuration pending',
    workMode: WorkMode.office,
    shiftStart: TimeOfDay(hour: 9, minute: 0),
    shiftEnd: TimeOfDay(hour: 18, minute: 0),
    graceMinutes: 0,
    minimumWorkMinutes: 0,
    geofenceRadiusMeters: 0,
    locationAccuracyMeters: 30,
    locationMode: AttendanceLocationMode.none,
    selfieMode: AttendanceSelfieMode.disabled,
    requiresRegisteredDevice: false,
    integrityRequired: false,
    canPunch: false,
    trackingIntervalMinutes: 15,
  ),
  supportEmail: AppConfig.supportEmail,
  configVersion: 0,
  runtimeLoaded: localRuntime,
  employeeId: '',
  employeeName: 'Employee',
  onboarding: const TenantOnboarding(),
  release: const MobileReleasePolicy(
    currentVersion: AppConfig.appVersion,
    minimumVersion: AppConfig.appVersion,
    recommendedVersion: AppConfig.appVersion,
  ),
);

TenantConfig _localConfig() {
  final base = _publicConfig(localRuntime: true);
  return TenantConfig(
    tenantId: 'local-demo',
    environment: base.environment,
    branding: TenantBranding(
      companyName: AppConfig.companyName,
      productName: 'DeltCRM',
      primaryColor: AppConfig.brandColor,
    ),
    locale: const Locale('en'),
    timezone: AppConfig.timezone,
    currencyCode: base.currencyCode,
    countryCode: base.countryCode,
    weekendDays: const {5, 6},
    modules: const {
      TenantModule.attendance,
      TenantModule.fieldTracking,
      TenantModule.regularization,
    },
    attendancePolicy: const AttendancePolicyConfig(
      name: 'Local demo policy',
      workMode: WorkMode.hybrid,
      shiftStart: TimeOfDay(hour: 9, minute: 0),
      shiftEnd: TimeOfDay(hour: 18, minute: 0),
      graceMinutes: 10,
      minimumWorkMinutes: 480,
      geofenceRadiusMeters: 150,
      locationAccuracyMeters: 30,
      locationMode: AttendanceLocationMode.officeGeofence,
      selfieMode: AttendanceSelfieMode.required,
      requiresRegisteredDevice: false,
      integrityRequired: false,
      canPunch: true,
      trackingIntervalMinutes: 15,
    ),
    supportEmail: base.supportEmail,
    configVersion: 1,
    runtimeLoaded: true,
    employeeId: 'local-demo-employee',
    employeeName: 'Demo Employee',
    onboarding: const TenantOnboarding(),
    release: const MobileReleasePolicy(
      currentVersion: AppConfig.appVersion,
      minimumVersion: AppConfig.appVersion,
      recommendedVersion: AppConfig.appVersion,
    ),
  );
}

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

enum TenantModule { attendance, fieldTracking, regularization, leave, expenses }

enum WorkMode { office, field, hybrid, remote }

enum AttendanceLocationMode { none, officeGeofence, fieldGps }

enum AttendanceSelfieMode { disabled, required }

class MobileReleasePolicy {
  const MobileReleasePolicy({
    required this.currentVersion,
    required this.minimumVersion,
    required this.recommendedVersion,
    this.androidUpdateUrl,
    this.iosUpdateUrl,
  });

  final String currentVersion;
  final String minimumVersion;
  final String recommendedVersion;
  final String? androidUpdateUrl;
  final String? iosUpdateUrl;

  bool get updateRequired =>
      isVersionBelowMinimum(currentVersion, minimumVersion);
  bool get updateRecommended =>
      isVersionBelowMinimum(currentVersion, recommendedVersion);
  String? get updateUrl => defaultTargetPlatform == TargetPlatform.iOS
      ? iosUpdateUrl
      : androidUpdateUrl;
}

bool isVersionBelowMinimum(String current, String minimum) {
  final currentParts = _versionParts(current);
  final minimumParts = _versionParts(minimum);
  for (var index = 0; index < 3; index += 1) {
    if (currentParts[index] != minimumParts[index]) {
      return currentParts[index] < minimumParts[index];
    }
  }
  return false;
}

List<int> _versionParts(String value) {
  final core = value.trim().split(RegExp(r'[-+]')).first;
  final parts = core.split('.');
  return List.generate(
    3,
    (index) => index < parts.length ? int.tryParse(parts[index]) ?? 0 : 0,
  );
}

class TenantBranding {
  const TenantBranding({
    required this.companyName,
    required this.productName,
    required this.primaryColor,
    this.logoUrl,
  });

  final String companyName;
  final String productName;
  final Color primaryColor;
  final String? logoUrl;
}

class AttendancePolicyConfig {
  const AttendancePolicyConfig({
    required this.name,
    required this.workMode,
    required this.shiftStart,
    required this.shiftEnd,
    required this.graceMinutes,
    required this.minimumWorkMinutes,
    required this.geofenceRadiusMeters,
    required this.locationAccuracyMeters,
    required this.locationMode,
    required this.selfieMode,
    required this.requiresRegisteredDevice,
    required this.integrityRequired,
    required this.canPunch,
    required this.trackingIntervalMinutes,
  });

  final String name;
  final WorkMode workMode;
  final TimeOfDay shiftStart;
  final TimeOfDay shiftEnd;
  final int graceMinutes;
  final int minimumWorkMinutes;
  final int geofenceRadiusMeters;
  final int locationAccuracyMeters;
  final AttendanceLocationMode locationMode;
  final AttendanceSelfieMode selfieMode;
  final bool requiresRegisteredDevice;
  final bool integrityRequired;
  final bool canPunch;
  final int trackingIntervalMinutes;

  bool get requiresFace => selfieMode == AttendanceSelfieMode.required;
  bool get requiresLocation => locationMode != AttendanceLocationMode.none;
}

class TenantOnboarding {
  const TenantOnboarding({
    this.deviceRegistrationRequired = false,
    this.deviceRegistrationComplete = true,
    this.locationPermissionRequired = false,
    this.biometricConsentRequired = false,
    this.biometricConsentComplete = true,
    this.faceEnrollmentRequired = false,
    this.faceEnrollmentComplete = true,
  });

  final bool deviceRegistrationRequired;
  final bool deviceRegistrationComplete;
  final bool locationPermissionRequired;
  final bool biometricConsentRequired;
  final bool biometricConsentComplete;
  final bool faceEnrollmentRequired;
  final bool faceEnrollmentComplete;

  bool get locationPermissionPending => locationPermissionRequired;
  bool get devicePending =>
      deviceRegistrationRequired && !deviceRegistrationComplete;
  bool get consentPending =>
      biometricConsentRequired && !biometricConsentComplete;
  bool get enrollmentPending =>
      faceEnrollmentRequired && !faceEnrollmentComplete;
}

class TenantConfig {
  const TenantConfig({
    required this.tenantId,
    required this.environment,
    required this.branding,
    required this.locale,
    required this.timezone,
    required this.currencyCode,
    required this.countryCode,
    required this.weekendDays,
    required this.modules,
    required this.attendancePolicy,
    required this.supportEmail,
    required this.configVersion,
    required this.runtimeLoaded,
    required this.employeeId,
    required this.employeeName,
    required this.onboarding,
    required this.release,
  });

  final String tenantId;
  final String environment;
  final TenantBranding branding;
  final Locale locale;
  final String timezone;
  final String currencyCode;
  final String countryCode;
  final Set<int> weekendDays;
  final Set<TenantModule> modules;
  final AttendancePolicyConfig attendancePolicy;
  final String supportEmail;
  final int configVersion;
  final bool runtimeLoaded;
  final String employeeId;
  final String employeeName;
  final TenantOnboarding onboarding;
  final MobileReleasePolicy release;

  bool hasModule(TenantModule module) => modules.contains(module);

  TenantConfig copyWith({Locale? locale}) => TenantConfig(
    tenantId: tenantId,
    environment: environment,
    branding: branding,
    locale: locale ?? this.locale,
    timezone: timezone,
    currencyCode: currencyCode,
    countryCode: countryCode,
    weekendDays: weekendDays,
    modules: modules,
    attendancePolicy: attendancePolicy,
    supportEmail: supportEmail,
    configVersion: configVersion,
    runtimeLoaded: runtimeLoaded,
    employeeId: employeeId,
    employeeName: employeeName,
    onboarding: onboarding,
    release: release,
  );
}

import 'package:flutter/material.dart';

enum TenantModule { attendance, fieldTracking, regularization, leave, expenses }

enum WorkMode { office, field, hybrid, remote }

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
    required this.requiresFace,
    required this.requiresRegisteredDevice,
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
  final bool requiresFace;
  final bool requiresRegisteredDevice;
  final int trackingIntervalMinutes;
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
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import 'tenant_config.dart';

final tenantControllerProvider =
    NotifierProvider<TenantController, TenantConfig>(TenantController.new);

class TenantController extends Notifier<TenantConfig> {
  @override
  TenantConfig build() => TenantConfig(
    tenantId: AppConfig.tenantId,
    environment: AppConfig.environment,
    branding: TenantBranding(
      companyName: AppConfig.companyName,
      productName: AppConfig.productName,
      primaryColor: AppConfig.brandColor,
    ),
    locale: Locale(AppConfig.defaultLocale),
    timezone: AppConfig.timezone,
    currencyCode: AppConfig.currencyCode,
    countryCode: AppConfig.countryCode,
    weekendDays: const {5, 6},
    modules: const {
      TenantModule.attendance,
      TenantModule.fieldTracking,
      TenantModule.regularization,
    },
    attendancePolicy: const AttendancePolicyConfig(
      name: 'Oman Standard Attendance',
      workMode: WorkMode.hybrid,
      shiftStart: TimeOfDay(hour: 9, minute: 0),
      shiftEnd: TimeOfDay(hour: 18, minute: 0),
      graceMinutes: 10,
      minimumWorkMinutes: 480,
      geofenceRadiusMeters: 150,
      locationAccuracyMeters: 30,
      requiresFace: true,
      requiresRegisteredDevice: true,
      trackingIntervalMinutes: 15,
    ),
    supportEmail: AppConfig.supportEmail,
  );

  void setLocale(Locale locale) {
    if (!const [Locale('en'), Locale('ar')].contains(locale)) return;
    state = state.copyWith(locale: locale);
  }
}

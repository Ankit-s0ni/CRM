import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/app_config.dart';
import '../network/api_routes.dart';
import '../network/api_service.dart';
import 'tenant_config.dart';

class TenantRuntimeRepository {
  TenantRuntimeRepository(this._api, this._storage);

  static const fieldRuntimeKey = 'deltcrm.runtime.field-enabled';
  final ApiService _api;
  final FlutterSecureStorage _storage;

  String get _cacheIndexKey =>
      'deltcrm.runtime.${_api.workspaceSubdomain}.current';

  Future<TenantConfig> fetch() async {
    final response = await _api.get<Map<String, dynamic>>(
      ApiRoutes.mobileRuntimeConfig,
    );
    final envelope = response.data ?? const <String, dynamic>{};
    final raw = envelope['data'] as Map<String, dynamic>? ?? envelope;
    final config = _parse(raw);
    final cacheKey = _scopedCacheKey(config);
    final previousKey = await _storage.read(key: _cacheIndexKey);
    if (previousKey != null && previousKey != cacheKey) {
      await _storage.delete(key: previousKey);
    }
    await _storage.write(key: cacheKey, value: jsonEncode(raw));
    await _storage.write(key: _cacheIndexKey, value: cacheKey);
    await _storage.write(
      key: fieldRuntimeKey,
      value: config.hasModule(TenantModule.fieldTracking) ? 'true' : 'false',
    );
    return config;
  }

  Future<TenantConfig?> readCached() async {
    final cacheKey = await _storage.read(key: _cacheIndexKey);
    if (cacheKey == null || !_isScopedCacheKey(cacheKey)) return null;
    final encoded = await _storage.read(key: cacheKey);
    if (encoded == null) return null;
    try {
      return _parse(jsonDecode(encoded) as Map<String, dynamic>);
    } catch (_) {
      await clear();
      return null;
    }
  }

  Future<void> clear() async {
    final cacheKey = await _storage.read(key: _cacheIndexKey);
    if (cacheKey != null && _isScopedCacheKey(cacheKey)) {
      await _storage.delete(key: cacheKey);
    }
    await _storage.delete(key: _cacheIndexKey);
    await _storage.write(key: fieldRuntimeKey, value: 'false');
  }

  String _scopedCacheKey(TenantConfig config) {
    final scope = '${config.tenantId}.${config.employeeId}';
    return 'deltcrm.runtime.${_api.workspaceSubdomain}.$scope.${config.configVersion}';
  }

  bool _isScopedCacheKey(String key) =>
      key.startsWith('deltcrm.runtime.${_api.workspaceSubdomain}.') &&
      key != _cacheIndexKey;

  TenantConfig _parse(Map<String, dynamic> raw) {
    final product = _map(raw['product']);
    final tenant = _map(raw['tenant']);
    final employee = _map(raw['employee']);
    final modules = _map(raw['modules']);
    final attendance = _map(raw['attendance']);
    final fieldTracking = _map(raw['fieldTracking']);
    final onboarding = _map(raw['onboarding']);
    final release = _map(raw['release']);
    final tenantId = _string(tenant['id']);
    if (tenantId.isEmpty || _string(product['name']) != 'DeltCRM') {
      throw const FormatException('Invalid tenant runtime configuration');
    }
    return TenantConfig(
      tenantId: tenantId,
      environment: AppConfig.environment,
      branding: TenantBranding(
        companyName: _string(tenant['name'], fallback: 'DeltCRM Workspace'),
        productName: 'DeltCRM',
        primaryColor: AppConfig.brandColor,
        logoUrl: _nullableString(tenant['logoUrl']),
      ),
      locale: Locale(
        _localeLanguage(_string(tenant['locale'], fallback: 'en')),
      ),
      timezone: _string(tenant['timezone'], fallback: 'UTC'),
      currencyCode: AppConfig.currencyCode,
      countryCode: AppConfig.countryCode,
      weekendDays: const {5, 6},
      modules: {
        if (_enabled(modules['attendance'])) TenantModule.attendance,
        if (_enabled(modules['fieldTracking'])) TenantModule.fieldTracking,
        if (_enabled(modules['regularization'])) TenantModule.regularization,
        if (_enabled(attendance['leave']) || _enabled(modules['leave']))
          TenantModule.leave,
      },
      attendancePolicy: AttendancePolicyConfig(
        name: 'Effective attendance policy',
        workMode: _workMode(_string(employee['workType'])),
        shiftStart: const TimeOfDay(hour: 9, minute: 0),
        shiftEnd: const TimeOfDay(hour: 18, minute: 0),
        graceMinutes: 0,
        minimumWorkMinutes: 0,
        geofenceRadiusMeters: 0,
        locationAccuracyMeters: 30,
        locationMode: _locationMode(_string(attendance['locationMode'])),
        selfieMode: _selfieMode(_string(attendance['selfieMode'])),
        requiresRegisteredDevice:
            attendance['registeredDeviceRequired'] == true,
        integrityRequired: attendance['integrityRequired'] == true,
        canPunch: attendance['canPunch'] == true,
        trackingIntervalMinutes:
            (fieldTracking['intervalMinutes'] as num?)?.toInt() ?? 15,
      ),
      supportEmail: AppConfig.supportEmail,
      configVersion: (raw['configVersion'] as num?)?.toInt() ?? 1,
      runtimeLoaded: true,
      employeeId: _string(employee['id']),
      employeeName: _string(employee['displayName'], fallback: 'Employee'),
      onboarding: TenantOnboarding(
        deviceRegistrationRequired:
            onboarding['deviceRegistrationRequired'] == true,
        deviceRegistrationComplete:
            onboarding['deviceRegistrationComplete'] != false,
        locationPermissionRequired:
            onboarding['locationPermissionRequired'] == true,
        biometricConsentRequired:
            onboarding['biometricConsentRequired'] == true,
        biometricConsentComplete:
            onboarding['biometricConsentComplete'] != false,
        faceEnrollmentRequired: onboarding['faceEnrollmentRequired'] == true,
        faceEnrollmentComplete: onboarding['faceEnrollmentComplete'] != false,
      ),
      release: MobileReleasePolicy(
        currentVersion: AppConfig.appVersion,
        minimumVersion: _string(
          release['minimumVersion'],
          fallback: AppConfig.appVersion,
        ),
        recommendedVersion: _string(
          release['recommendedVersion'],
          fallback: AppConfig.appVersion,
        ),
        androidUpdateUrl: _nullableString(release['androidUpdateUrl']),
        iosUpdateUrl: _nullableString(release['iosUpdateUrl']),
      ),
    );
  }
}

Map<String, dynamic> _map(Object? value) =>
    value is Map<String, dynamic> ? value : const <String, dynamic>{};
bool _enabled(Object? value) => _map(value)['enabled'] == true;
String _string(Object? value, {String fallback = ''}) =>
    value is String && value.trim().isNotEmpty ? value.trim() : fallback;
String? _nullableString(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;
String _localeLanguage(String locale) => locale.split(RegExp('[-_]')).first;
WorkMode _workMode(String value) => switch (value) {
  'FIELD' => WorkMode.field,
  'HYBRID' => WorkMode.hybrid,
  'REMOTE' => WorkMode.remote,
  _ => WorkMode.office,
};
AttendanceLocationMode _locationMode(String value) => switch (value) {
  'OFFICE_GEOFENCE' => AttendanceLocationMode.officeGeofence,
  'FIELD_GPS' => AttendanceLocationMode.fieldGps,
  _ => AttendanceLocationMode.none,
};
AttendanceSelfieMode _selfieMode(String value) => value == 'REQUIRED'
    ? AttendanceSelfieMode.required
    : AttendanceSelfieMode.disabled;

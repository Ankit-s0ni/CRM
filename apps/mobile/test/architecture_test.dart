import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/network/api_routes.dart';
import 'package:hrms_attendance/core/router/app_routes.dart';

void main() {
  test('all M1-M20 application routes are centralized and unique', () {
    const routes = {
      AppRoutes.splash,
      AppRoutes.login,
      AppRoutes.device,
      AppRoutes.permissions,
      AppRoutes.consent,
      AppRoutes.enrollment,
      AppRoutes.home,
      AppRoutes.punchCamera,
      AppRoutes.verifying,
      AppRoutes.punchSuccess,
      AppRoutes.punchFailure,
      AppRoutes.breakFlow,
      AppRoutes.history,
      AppRoutes.dayDetail,
      AppRoutes.regularization,
      AppRoutes.requests,
      AppRoutes.tracking,
      AppRoutes.sync,
      AppRoutes.notifications,
      AppRoutes.profile,
      AppRoutes.settings,
    };
    expect(routes, hasLength(21));
  });

  test('Sprint 5 API paths are centralized', () {
    expect(ApiRoutes.registerDevice, '/devices/register');
    expect(ApiRoutes.myConsent, '/biometric-consents/me');
    expect(ApiRoutes.enrollmentStatus, '/face-enrollments/me/status');
    expect(ApiRoutes.verificationLogs, '/verification-logs');
    expect(ApiRoutes.securityAlerts, '/security-alerts');
  });

  test('every mobile feature owns screens and widgets folders', () {
    const features = [
      'attendance',
      'auth',
      'consent',
      'device',
      'enrollment',
      'home',
      'notifications',
      'permissions',
      'profile',
      'requests',
      'security',
      'settings',
      'sync',
      'tracking',
    ];

    for (final feature in features) {
      final presentation = Directory('lib/features/$feature/presentation');
      expect(
        presentation.existsSync(),
        isTrue,
        reason: '$feature presentation',
      );
      expect(
        Directory('${presentation.path}/screens').existsSync(),
        isTrue,
        reason: '$feature screens folder',
      );
      expect(
        Directory('${presentation.path}/widgets').existsSync(),
        isTrue,
        reason: '$feature widgets folder',
      );
    }
  });

  test('presentation does not use combined plural screen files', () {
    final files = Directory('lib/features')
        .listSync(recursive: true)
        .whereType<File>()
        .map((file) => file.path)
        .where((path) => path.endsWith('_screens.dart'));
    expect(files, isEmpty);
  });
}

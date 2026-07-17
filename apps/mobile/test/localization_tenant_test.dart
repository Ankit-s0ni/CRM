import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/router/app_router.dart';
import 'package:hrms_attendance/core/router/app_routes.dart';
import 'package:hrms_attendance/core/network/network_providers.dart';
import 'package:hrms_attendance/core/tenant/tenant_config.dart';
import 'package:hrms_attendance/core/tenant/tenant_controller.dart';
import 'package:hrms_attendance/main.dart';

import 'support/test_api_service.dart';

void main() {
  testWidgets(
    'Arabic locale switches the app to RTL and localizes primary navigation',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final container = ProviderContainer(
        overrides: [
          apiServiceProvider.overrideWithValue(createTestApiService()),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(container: container, child: const HrmsApp()),
      );

      container
          .read(tenantControllerProvider.notifier)
          .setLocale(const Locale('ar'));
      container.read(appRouterProvider).go(AppRoutes.home);
      await tester.pumpAndSettle();

      expect(find.text('صباح الخير'), findsOneWidget);
      expect(find.text('الحضور'), findsOneWidget);
      final direction = tester.widget<Directionality>(
        find.byType(Directionality).first,
      );
      expect(direction.textDirection, TextDirection.rtl);

      const localizedRoutes = [
        AppRoutes.history,
        AppRoutes.regularization,
        AppRoutes.requests,
        AppRoutes.tracking,
        AppRoutes.notifications,
        AppRoutes.profile,
        AppRoutes.settings,
        AppRoutes.permissions,
      ];
      for (final route in localizedRoutes) {
        container.read(appRouterProvider).go(route);
        await tester.pumpAndSettle();
        expect(
          tester.takeException(),
          isNull,
          reason: 'Arabic RTL failed at $route',
        );
      }
    },
  );

  test('tenant configuration exposes policy and module boundaries', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final tenant = container.read(tenantControllerProvider);
    expect(tenant.tenantId, isNotEmpty);
    expect(tenant.timezone, 'Asia/Muscat');
    expect(tenant.hasModule(TenantModule.attendance), isTrue);
    expect(tenant.attendancePolicy.geofenceRadiusMeters, greaterThan(0));
    expect(tenant.attendancePolicy.trackingIntervalMinutes, greaterThan(0));
  });
}

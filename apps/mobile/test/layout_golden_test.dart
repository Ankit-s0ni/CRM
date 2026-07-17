import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/network/network_providers.dart';
import 'package:hrms_attendance/core/router/app_router.dart';
import 'package:hrms_attendance/core/router/app_routes.dart';
import 'package:hrms_attendance/core/theme/app_theme.dart';
import 'package:hrms_attendance/features/security/presentation/screens/verification_progress_screen.dart';
import 'package:hrms_attendance/l10n/app_localizations.dart';
import 'package:hrms_attendance/main.dart';

import 'support/test_api_service.dart';

void main() {
  const routes = <(String, String)>[
    (AppRoutes.splash, 'M1-splash'),
    (AppRoutes.login, 'M2-login'),
    (AppRoutes.device, 'M3-device-registration'),
    (AppRoutes.consent, 'M4-biometric-consent'),
    (AppRoutes.enrollment, 'M5-face-enrollment'),
    (AppRoutes.home, 'M6-home-today'),
    (AppRoutes.punchCamera, 'M7-check-in-camera'),
    (AppRoutes.punchSuccess, 'M9-punch-success'),
    (AppRoutes.punchFailure, 'M10-punch-failure'),
    (AppRoutes.breakFlow, 'M11-break-management'),
    (AppRoutes.history, 'M12-attendance-history'),
    (AppRoutes.dayDetail, 'M13-day-detail'),
    (AppRoutes.regularization, 'M14-request-regularization'),
    (AppRoutes.requests, 'M15-my-requests'),
    (AppRoutes.tracking, 'M16-field-tracking'),
    (AppRoutes.sync, 'M17-offline-sync-queue'),
    (AppRoutes.notifications, 'M18-notifications'),
    (AppRoutes.profile, 'M19-profile'),
    (AppRoutes.settings, 'M20-settings-permissions'),
  ];

  for (final route in routes) {
    testWidgets('${route.$2} layout baseline', (tester) async {
      await _configureReferenceViewport(tester);
      final boundaryKey = GlobalKey();
      final container = ProviderContainer(
        overrides: [
          apiServiceProvider.overrideWithValue(createTestApiService()),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        RepaintBoundary(
          key: boundaryKey,
          child: UncontrolledProviderScope(
            container: container,
            child: const HrmsApp(),
          ),
        ),
      );
      if (route.$1 == AppRoutes.splash) {
        await tester.pump(const Duration(milliseconds: 100));
      } else {
        // Let the initial splash callback finish before selecting the route under
        // test, otherwise its delayed redirect replaces the requested screen.
        await tester.pump(const Duration(milliseconds: 800));
        container.read(appRouterProvider).go(route.$1);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 500));
        // Resolve mocked network futures without waiting for intentional camera
        // and enrollment animations, which never settle by design.
        await tester.pump(const Duration(milliseconds: 50));
        await tester.pump(const Duration(milliseconds: 50));
      }

      expect(tester.takeException(), isNull, reason: 'Route ${route.$1}');
      await expectLater(
        find.byKey(boundaryKey),
        matchesGoldenFile('goldens/sprint5/${route.$2}.png'),
      );
      if (route.$1 == AppRoutes.splash) {
        await tester.pump(const Duration(milliseconds: 700));
      }
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }

  testWidgets('M8-verifying layout baseline', (tester) async {
    await _configureReferenceViewport(tester);
    final boundaryKey = GlobalKey();
    final pending = Completer<bool>();
    await tester.pumpWidget(
      RepaintBoundary(
        key: boundaryKey,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: VerificationProgressScreen(
            verify: () => pending.future,
            onSuccess: () {},
            onFailure: () {},
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await expectLater(
      find.byKey(boundaryKey),
      matchesGoldenFile('goldens/sprint5/M8-verifying.png'),
    );
  });
}

Future<void> _configureReferenceViewport(WidgetTester tester) async {
  tester.view.devicePixelRatio = 2;
  tester.view.physicalSize = const Size(780, 1768);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
}

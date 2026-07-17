import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/router/app_router.dart';
import 'package:hrms_attendance/core/router/app_routes.dart';
import 'package:hrms_attendance/core/network/network_providers.dart';
import 'package:hrms_attendance/main.dart';

import 'support/test_api_service.dart';

void main() {
  const paths = [
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
  ];
  const sizes = [Size(320, 568), Size(390, 844), Size(430, 932)];
  for (final size in sizes) {
    testWidgets('all M1-M20 routes render at ${size.width}×${size.height}', (
      tester,
    ) async {
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.binding.setSurfaceSize(size);
      final container = ProviderContainer(
        overrides: [
          apiServiceProvider.overrideWithValue(createTestApiService()),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(container: container, child: const HrmsApp()),
      );
      final router = container.read(appRouterProvider);
      for (final path in paths) {
        router.go(path);
        await tester.pump(const Duration(milliseconds: 500));
        final routeException = tester.takeException();
        expect(
          routeException,
          isNull,
          reason: 'Route failed: $path at ${size.width}×${size.height}',
        );
      }
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
    });
  }

  testWidgets('all M1-M20 routes support 200 percent text scaling', (
    tester,
  ) async {
    addTearDown(() {
      tester.binding.setSurfaceSize(null);
      tester.platformDispatcher.clearTextScaleFactorTestValue();
    });
    await tester.binding.setSurfaceSize(const Size(390, 844));
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    final container = ProviderContainer(
      overrides: [apiServiceProvider.overrideWithValue(createTestApiService())],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const HrmsApp()),
    );
    final router = container.read(appRouterProvider);
    for (final path in paths) {
      router.go(path);
      await tester.pump(const Duration(milliseconds: 800));
      expect(
        tester.takeException(),
        isNull,
        reason: 'Route failed at 200 percent text scaling: $path',
      );
    }
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  });

  testWidgets('all M1-M20 routes meet automated accessibility guidelines', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.binding.setSurfaceSize(const Size(390, 844));
    final container = ProviderContainer(
      overrides: [apiServiceProvider.overrideWithValue(createTestApiService())],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const HrmsApp()),
    );
    final router = container.read(appRouterProvider);

    for (final path in paths) {
      router.go(path);
      await tester.pump(const Duration(milliseconds: 800));
      expect(tester.takeException(), isNull, reason: 'Route failed: $path');
      await expectLater(
        tester,
        meetsGuideline(labeledTapTargetGuideline),
        reason: 'Unlabeled control on $path',
      );
      await expectLater(
        tester,
        meetsGuideline(androidTapTargetGuideline),
        reason: 'Undersized control on $path',
      );
      await expectLater(
        tester,
        meetsGuideline(textContrastGuideline),
        reason: 'Insufficient text contrast on $path',
      );
    }

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    semantics.dispose();
  });
}

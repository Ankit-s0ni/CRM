import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:hrms_attendance/core/router/app_routes.dart';
import 'package:hrms_attendance/core/router/widgets/app_navigation_shell.dart';
import 'package:hrms_attendance/l10n/app_localizations.dart';

void main() {
  late GoRouter router;

  setUp(() {
    router = GoRouter(
      initialLocation: AppRoutes.home,
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (_, _, shell) => AppNavigationShell(navigationShell: shell),
          branches: [
            for (final route in const {
              AppRoutes.home: 'Home page',
              AppRoutes.history: 'Attendance page',
              AppRoutes.requests: 'Requests page',
              AppRoutes.profile: 'Profile page',
            }.entries)
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: route.key,
                    builder: (_, _) => Scaffold(body: Text(route.value)),
                  ),
                ],
              ),
          ],
        ),
      ],
    );
  });

  tearDown(() => router.dispose());

  Widget app() => ProviderScope(
    child: MaterialApp.router(
      routerConfig: router,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
    ),
  );

  testWidgets('tabs navigate, back returns home, then asks before exit', (
    tester,
  ) async {
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();

    expect(find.text('Home page'), findsOneWidget);
    await tester.tap(find.text('Attendance'));
    await tester.pumpAndSettle();
    expect(find.text('Attendance page'), findsOneWidget);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Home page'), findsOneWidget);

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Leave the app?'), findsOneWidget);
    expect(find.text('Stay'), findsOneWidget);
    expect(find.text('Exit'), findsOneWidget);
  });
}

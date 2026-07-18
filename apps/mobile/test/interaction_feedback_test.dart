import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/features/auth/presentation/screens/login_screen.dart';
import 'package:hrms_attendance/features/requests/presentation/screens/regularization_screen.dart';
import 'package:hrms_attendance/features/tracking/presentation/screens/tracking_screen.dart';
import 'package:hrms_attendance/l10n/app_localizations.dart';
import 'package:hrms_attendance/features/tracking/presentation/tracking_controller.dart';

import 'support/sprint6_test_controllers.dart';

Widget _host(Widget child, {List<Override> overrides = const []}) =>
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: child,
      ),
    );

void main() {
  testWidgets(
    'login validates required credentials and explains password reset',
    (tester) async {
      await tester.pumpWidget(_host(LoginScreen(onSignIn: (_, _) async {})));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Sign in securely'));
      await tester.tap(find.text('Sign in securely'));
      await tester.pump();
      expect(find.text('Enter your work email'), findsOneWidget);
      expect(find.text('Enter your password'), findsOneWidget);

      await tester.ensureVisible(find.text('Forgot password?'));
      await tester.tap(find.text('Forgot password?'));
      await tester.pumpAndSettle();
      expect(find.text('Reset your password'), findsOneWidget);
      expect(find.text('Got it'), findsOneWidget);
    },
  );

  testWidgets('regularization blocks incomplete submissions', (tester) async {
    await tester.pumpWidget(_host(RegularizationScreen(onSubmit: () {})));

    await tester.tap(find.text('Send to manager'));
    await tester.pump();
    expect(find.text('Select the requested check-out time.'), findsOneWidget);
  });

  testWidgets('field tracking requires confirmation and updates status', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const TrackingScreen(),
        overrides: [
          trackingControllerProvider.overrideWith(TestTrackingController.new),
        ],
      ),
    );
    await tester.pump();

    await tester.ensureVisible(find.text('Start field tracking'));
    await tester.tap(find.text('Start field tracking'));
    await tester.pumpAndSettle();
    expect(find.text('Start field tracking?'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Start tracking'));
    await tester.pumpAndSettle();
    expect(find.text('Field tracking is active'), findsOneWidget);
  });
}

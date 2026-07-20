import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hrms_attendance/core/network/network_providers.dart';
import 'package:hrms_attendance/core/router/app_router.dart';

import 'package:hrms_attendance/main.dart';

import 'support/test_api_service.dart';

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  testWidgets('launches through splash into login', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: HrmsApp()));
    expect(find.text('Checking session…'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 800));
    await tester.pumpAndSettle();

    expect(find.textContaining('Your workday'), findsOneWidget);
    expect(find.text('Sign in securely'), findsOneWidget);
  });

  testWidgets('restores a valid stored session after app restart', (
    WidgetTester tester,
  ) async {
    FlutterSecureStorage.setMockInitialValues({
      'refresh_token': 'stored-refresh-token',
    });
    final container = ProviderContainer(
      overrides: [
        apiServiceProvider.overrideWithValue(
          createTestApiService(
            runtime: testRuntimeConfig(locationMode: 'NONE'),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const HrmsApp()),
    );
    await tester.pump(const Duration(milliseconds: 800));
    await tester.pumpAndSettle();

    expect(
      container.read(appRouterProvider).routeInformationProvider.value.uri.path,
      '/home',
    );
    expect(find.text('Sign in securely'), findsNothing);
  });
}

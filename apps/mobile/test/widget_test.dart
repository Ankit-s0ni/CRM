import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:hrms_attendance/main.dart';

void main() {
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
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/theme/app_theme.dart';
import 'package:hrms_attendance/features/attendance/presentation/widgets/face_capture_guide.dart';
import 'package:hrms_attendance/features/consent/domain/consent_repository.dart';
import 'package:hrms_attendance/features/consent/presentation/consent_controller.dart';
import 'package:hrms_attendance/features/consent/presentation/screens/consent_screen.dart';
import 'package:hrms_attendance/features/device/domain/device_repository.dart';
import 'package:hrms_attendance/features/device/presentation/device_controller.dart';
import 'package:hrms_attendance/features/device/presentation/screens/device_registration_screen.dart';
import 'package:hrms_attendance/features/enrollment/domain/enrollment_repository.dart';
import 'package:hrms_attendance/features/enrollment/presentation/enrollment_controller.dart';
import 'package:hrms_attendance/features/enrollment/presentation/screens/enrollment_screen.dart';
import 'package:hrms_attendance/features/security/presentation/widgets/verification_failure_card.dart';
import 'package:hrms_attendance/l10n/app_localizations.dart';

void main() {
  testWidgets('pending and blocked devices cannot continue', (tester) async {
    var continued = false;
    await tester.pumpWidget(
      _deviceHost('PENDING_APPROVAL', () => continued = true),
    );
    await tester.pumpAndSettle();

    expect(find.text('PENDING APPROVAL'), findsOneWidget);
    expect(find.textContaining('must approve this device'), findsOneWidget);
    expect(find.text('Check approval status'), findsOneWidget);
    expect(find.text('Continue securely'), findsNothing);
    expect(continued, isFalse);

    await tester.pumpWidget(_deviceHost('BLOCKED', () => continued = true));
    await tester.pumpAndSettle();
    expect(find.text('BLOCKED'), findsOneWidget);
    expect(find.textContaining('blocked by your organization'), findsOneWidget);
    expect(find.text('Continue securely'), findsNothing);
  });

  testWidgets('active device exposes the secure continuation', (tester) async {
    var continued = false;
    await tester.pumpWidget(_deviceHost('ACTIVE', () => continued = true));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Continue securely'));
    expect(continued, isTrue);
  });

  testWidgets('active and withdrawn consent states are recoverable', (
    tester,
  ) async {
    var continued = false;
    var withdrew = false;
    await tester.pumpWidget(
      _consentHost(
        const {'active': true, 'policyVersion': '1.2'},
        onContinue: () => continued = true,
        onWithdraw: () => withdrew = true,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('CONSENT ACTIVE'), findsOneWidget);
    await tester.tap(find.text('Continue to face enrollment'));
    await tester.tap(find.text('Withdraw biometric consent'));
    expect(continued, isTrue);
    expect(withdrew, isTrue);

    await tester.pumpWidget(
      _consentHost(null, onContinue: () {}, onWithdraw: () {}),
    );
    await tester.pumpAndSettle();
    expect(find.text('I agree to biometric verification'), findsOneWidget);
    expect(find.text('Give consent'), findsOneWidget);
  });

  testWidgets('enrollment resumes active, missing-consent and capture states', (
    tester,
  ) async {
    var continued = false;
    await tester.pumpWidget(
      _enrollmentHost(const {
        'consentActive': true,
        'enrolled': true,
        'version': 2,
      }, onContinue: () => continued = true),
    );
    await tester.pumpAndSettle();
    expect(find.text('Face enrollment is active'), findsOneWidget);
    await tester.tap(find.text('Continue to attendance'));
    expect(continued, isTrue);

    await tester.pumpWidget(
      _enrollmentHost(const {'consentActive': false, 'enrolled': false}),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Consent is required'), findsOneWidget);
    expect(find.text('Review consent'), findsOneWidget);

    await tester.pumpWidget(
      _enrollmentHost(const {'consentActive': true, 'enrolled': false}),
    );
    await tester.pump();
    expect(find.byType(FaceCaptureGuide), findsOneWidget);
  });

  testWidgets('coded failures expose safe recovery guidance', (tester) async {
    var regularized = false;
    await tester.pumpWidget(
      _host(
        VerificationFailureCard(
          title: 'Outside approved attendance area',
          code: 'OUTSIDE_GEOFENCE',
          details: const {
            'distanceMeters': 2100,
            'regularizationAllowed': true,
          },
          onRetry: () {},
          onRegularization: () => regularized = true,
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('2100 m'), findsOneWidget);
    expect(find.text('Error: OUTSIDE_GEOFENCE'), findsOneWidget);
    await tester.tap(find.text('Request regularization'));
    expect(regularized, isTrue);

    await tester.pumpWidget(
      _host(
        VerificationFailureCard(
          title: 'Face did not match',
          code: 'FACE_MISMATCH',
          details: const {'attemptsRemaining': 2},
          onRetry: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Tips for a better scan'), findsOneWidget);
    expect(find.text('Retry (2 attempts left)'), findsOneWidget);
    expect(find.text('Error: FACE_MISMATCH'), findsOneWidget);

    await tester.pumpWidget(
      _host(
        VerificationFailureCard(
          title: 'Fake GPS detected',
          code: 'MOCK_LOCATION',
          onRetry: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Turn off mock-location apps'), findsOneWidget);
    expect(find.text('Error: MOCK_LOCATION'), findsOneWidget);
  });
}

Widget _deviceHost(String status, VoidCallback onContinue) => ProviderScope(
  key: UniqueKey(),
  overrides: [
    deviceRepositoryProvider.overrideWithValue(_DeviceRepository(status)),
  ],
  child: _host(
    DeviceRegistrationScreen(onRegister: () {}, onContinue: onContinue),
  ),
);

Widget _consentHost(
  Map<String, dynamic>? consent, {
  required VoidCallback onContinue,
  required VoidCallback onWithdraw,
}) => ProviderScope(
  key: UniqueKey(),
  overrides: [
    consentRepositoryProvider.overrideWithValue(_ConsentRepository(consent)),
  ],
  child: _host(
    ConsentScreen(
      onAccept: () {},
      onDecline: () {},
      onContinue: onContinue,
      onWithdraw: onWithdraw,
    ),
  ),
);

Widget _enrollmentHost(
  Map<String, dynamic> status, {
  VoidCallback? onContinue,
}) => ProviderScope(
  key: UniqueKey(),
  overrides: [
    enrollmentRepositoryProvider.overrideWithValue(
      _EnrollmentRepository(status),
    ),
  ],
  child: _host(
    EnrollmentScreen(
      onCapture: (_) async {},
      onContinue: onContinue ?? () {},
      onConsentRequired: () {},
    ),
  ),
);

Widget _host(Widget child) => MaterialApp(
  theme: AppTheme.light(),
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: Scaffold(body: child),
);

class _DeviceRepository implements DeviceRepository {
  const _DeviceRepository(this.status);

  final String status;

  @override
  Future<Map<String, dynamic>> current() async => {
    'data': [
      {
        'deviceUuid': '7a9c-device-42f1',
        'deviceModel': 'Pixel 7',
        'platform': 'ANDROID',
        'osVersion': '15',
        'status': status,
      },
    ],
  };

  @override
  Future<void> register(Map<String, dynamic> device) async {}

  @override
  Future<void> unregister() async {}
}

class _ConsentRepository implements ConsentRepository {
  _ConsentRepository(this.value);

  Map<String, dynamic>? value;

  @override
  Future<void> accept(String policyVersion) async {
    value = {'active': true, 'policyVersion': policyVersion};
  }

  @override
  Future<Map<String, dynamic>?> current() async => value;

  @override
  Future<void> withdraw() async => value = null;
}

class _EnrollmentRepository implements EnrollmentRepository {
  const _EnrollmentRepository(this.value);

  final Map<String, dynamic> value;

  @override
  Future<void> enroll(String filePath) async {}

  @override
  Future<Map<String, dynamic>> status() async => value;
}

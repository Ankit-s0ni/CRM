import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/features/permissions/domain/app_capability.dart';
import 'package:hrms_attendance/features/permissions/domain/capability_repository.dart';
import 'package:hrms_attendance/features/permissions/presentation/permissions_controller.dart';
import 'package:hrms_attendance/features/permissions/presentation/screens/permissions_onboarding_screen.dart';
import 'package:hrms_attendance/l10n/app_localizations.dart';

void main() {
  testWidgets('renders permission recovery actions and degraded continuation', (
    tester,
  ) async {
    var continued = false;
    await tester.pumpWidget(
      _host(
        repository: const _CapabilityRepository(
          CapabilitySnapshot(
            permissions: {
              AppCapability.camera: CapabilityPermission(
                capability: AppCapability.camera,
                status: CapabilityStatus.denied,
              ),
              AppCapability.locationWhileUsing: CapabilityPermission(
                capability: AppCapability.locationWhileUsing,
                status: CapabilityStatus.permanentlyDenied,
              ),
            },
            isOnline: true,
            batteryLevel: 75,
            isWeb: false,
          ),
        ),
        onContinue: () => continued = true,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Camera'), findsOneWidget);
    expect(find.text('Precise location'), findsOneWidget);
    expect(find.text('Not allowed'), findsOneWidget);
    expect(find.text('Enable'), findsOneWidget);
    expect(find.text('Open settings'), findsNWidgets(2));

    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue'));
    expect(continued, isTrue);
  });

  testWidgets('allows degraded continuation when capability inspection fails', (
    tester,
  ) async {
    var continued = false;
    await tester.pumpWidget(
      _host(
        repository: const _CapabilityRepository.failure(),
        onContinue: () => continued = true,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('continue in degraded mode'), findsOneWidget);
    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue'));
    expect(continued, isTrue);
  });
}

Widget _host({
  required CapabilityRepository repository,
  required VoidCallback onContinue,
}) => ProviderScope(
  overrides: [capabilityRepositoryProvider.overrideWithValue(repository)],
  child: MaterialApp(
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: PermissionsOnboardingScreen(onContinue: onContinue),
  ),
);

class _CapabilityRepository implements CapabilityRepository {
  const _CapabilityRepository(this.snapshot) : shouldFail = false;
  const _CapabilityRepository.failure() : snapshot = null, shouldFail = true;

  final CapabilitySnapshot? snapshot;
  final bool shouldFail;

  @override
  Future<CapabilitySnapshot> inspect() async {
    if (shouldFail) {
      throw StateError('Capability provider unavailable');
    }
    return snapshot!;
  }

  @override
  Future<bool> openSettings() async => true;

  @override
  Future<CapabilitySnapshot> request(AppCapability capability) => inspect();
}

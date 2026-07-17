import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../../../attendance/presentation/widgets/face_capture_guide.dart';
import '../enrollment_controller.dart';

class EnrollmentScreen extends ConsumerWidget {
  const EnrollmentScreen({
    super.key,
    required this.onCapture,
    required this.onContinue,
    required this.onConsentRequired,
  });
  final Future<void> Function(XFile file) onCapture;
  final VoidCallback onContinue;
  final VoidCallback onConsentRequired;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(enrollmentControllerProvider);
    final status = state.asData?.value;
    if (state.isLoading) {
      return AppPage(
        title: context.l10n.faceEnrollment,
        child: const Center(
          child: Padding(
            padding: EdgeInsets.all(48),
            child: CircularProgressIndicator(),
          ),
        ),
      );
    }
    if (state.hasError) {
      return AppPage(
        title: context.l10n.faceEnrollment,
        child: Column(
          children: [
            const Icon(Icons.cloud_off_rounded, size: 64),
            const SizedBox(height: 16),
            const Text(
              'Enrollment status could not be loaded.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: context.l10n.retry,
              onPressed: () => ref.invalidate(enrollmentControllerProvider),
            ),
          ],
        ),
      );
    }
    if (status?['enrolled'] == true) {
      return AppPage(
        title: context.l10n.faceEnrollment,
        child: Column(
          children: [
            const Icon(
              Icons.face_retouching_natural_rounded,
              color: AppTheme.green,
              size: 76,
            ),
            const SizedBox(height: 18),
            Text(
              'Face enrollment is active',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            const Text(
              'Your encrypted face template is ready for attendance verification.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            StatusChip(label: 'ENROLLED • VERSION ${status?['version'] ?? 1}'),
            const SizedBox(height: 24),
            PrimaryButton(
              label: 'Continue to attendance',
              icon: Icons.arrow_forward_rounded,
              onPressed: onContinue,
            ),
          ],
        ),
      );
    }
    if (status?['consentActive'] != true) {
      return AppPage(
        title: context.l10n.faceEnrollment,
        child: Column(
          children: [
            const Icon(Icons.privacy_tip_outlined, size: 72),
            const SizedBox(height: 18),
            Text(
              'Consent is required before enrollment',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            const Text(
              'Review the biometric policy and give consent before capturing an enrollment photo.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            PrimaryButton(
              label: 'Review consent',
              onPressed: onConsentRequired,
            ),
          ],
        ),
      );
    }
    return Scaffold(
      backgroundColor: AppTheme.charcoal,
      appBar: AppBar(
        backgroundColor: AppTheme.charcoal,
        foregroundColor: Colors.white,
        title: Text(context.l10n.faceEnrollment),
      ),
      body: SafeArea(
        child: FaceCaptureGuide(
          onCaptured: onCapture,
          captureLabel: context.l10n.captureEnrollment,
        ),
      ),
    );
  }
}

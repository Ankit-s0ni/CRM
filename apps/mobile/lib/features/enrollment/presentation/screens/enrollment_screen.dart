import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../widgets/enrollment_face_guide.dart';
import '../../../../l10n/l10n_context.dart';

class EnrollmentScreen extends StatelessWidget {
  const EnrollmentScreen({super.key, required this.onCapture});
  final VoidCallback onCapture;
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppTheme.charcoal,
    appBar: AppBar(
      backgroundColor: AppTheme.charcoal,
      foregroundColor: Colors.white,
      title: Text(context.l10n.faceEnrollment),
    ),
    body: SafeArea(
      child: Column(
        children: [
          const Expanded(child: Center(child: EnrollmentFaceGuide())),
          Text(
            context.l10n.captureGuidance,
            style: const TextStyle(color: Colors.white),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: PrimaryButton(
              label: context.l10n.captureEnrollment,
              onPressed: onCapture,
            ),
          ),
        ],
      ),
    ),
  );
}

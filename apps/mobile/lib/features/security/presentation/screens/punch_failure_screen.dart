import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../widgets/verification_failure_card.dart';
import '../../../../l10n/l10n_context.dart';

class PunchFailureScreen extends StatelessWidget {
  const PunchFailureScreen({super.key, required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => AppPage(
    title: context.l10n.punchFailed,
    child: Column(
      children: [
        for (final failure in const [
          ('You are 2.1 km from the office', 'OUTSIDE_GEOFENCE'),
          ('Face did not match · 2 attempts left', 'FACE_MISMATCH'),
          ('Fake GPS detected', 'MOCK_LOCATION'),
          ('This is not your registered device', 'DEVICE_NOT_REGISTERED'),
        ]) ...[
          VerificationFailureCard(
            title: failure.$1,
            code: failure.$2,
            onRetry: onRetry,
          ),
          const SizedBox(height: 10),
        ],
      ],
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../attendance/presentation/attendance_controller.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../widgets/verification_failure_card.dart';
import '../../../../l10n/l10n_context.dart';

class PunchFailureScreen extends ConsumerWidget {
  const PunchFailureScreen({
    super.key,
    required this.onRetry,
    this.onRegularization,
  });
  final VoidCallback onRetry;
  final VoidCallback? onRegularization;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final failure = ref
        .watch(attendanceControllerProvider)
        .asData
        ?.value
        .failure;
    return AppPage(
      title: context.l10n.punchFailed,
      child: Column(
        children: [
          VerificationFailureCard(
            title: failure?.message ?? 'Attendance verification failed.',
            code: failure?.code ?? 'VERIFICATION_FAILED',
            details: failure?.details ?? const {},
            onRetry: onRetry,
            onRegularization: onRegularization,
          ),
        ],
      ),
    );
  }
}

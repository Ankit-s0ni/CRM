import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../attendance_controller.dart';
import '../../domain/attendance_models.dart';
import '../../../../l10n/l10n_context.dart';

class PunchSuccessScreen extends ConsumerWidget {
  const PunchSuccessScreen({
    super.key,
    required this.onDone,
    required this.onTimeline,
  });
  final VoidCallback onDone;
  final VoidCallback onTimeline;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendance = ref.watch(attendanceControllerProvider).asData?.value;
    final checkedOut = attendance?.phase == AttendancePhase.checkedOut;
    final eventTime = attendance?.lastPunch?.attendance['timeline'] is List
        ? ((attendance!.lastPunch!.attendance['timeline'] as List).last
                  as Map<String, dynamic>)['eventTime']
              as String?
        : null;
    final parsedTime = eventTime == null ? null : DateTime.tryParse(eventTime);
    final time = TimeOfDay.fromDateTime(
      parsedTime?.toLocal() ?? DateTime.now(),
    ).format(context);
    final checks = attendance?.lastPunch?.checks ?? const <String>[];
    return AppPage(
      title: context.l10n.punchSuccessful,
      child: Column(
        children: [
          const SizedBox(height: 36),
          const CircleAvatar(
            radius: 44,
            backgroundColor: Color(0xFFE5F5EF),
            child: Icon(Icons.check, color: AppTheme.green, size: 48),
          ),
          const SizedBox(height: 18),
          Text(
            checkedOut
                ? context.l10n.checkedOutAt(time)
                : context.l10n.checkedInAt(time),
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 20),
          AppCard(
            child: Text(
              '${checks.contains('location') ? 'Approved location ✓' : 'Location skipped by policy'}\n'
              '${checks.contains('face') ? 'Face match ✓' : 'Face match not required'}\n'
              '${checks.contains('device') ? 'Registered device ✓' : 'Device check skipped'}\n'
              '${checkedOut ? 'Workday completed' : 'Shift started'}',
            ),
          ),
          const SizedBox(height: 20),
          PrimaryButton(label: context.l10n.done, onPressed: onDone),
          TextButton(
            onPressed: onTimeline,
            child: Text(context.l10n.viewTimeline),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/tenant/tenant_controller.dart';
import '../../../../core/tenant/tenant_config.dart';
import '../../../../l10n/l10n_context.dart';
import '../../../attendance/domain/attendance_models.dart';
import '../../../attendance/presentation/attendance_controller.dart';
import '../home_controller.dart';
import '../widgets/home_quick_actions.dart';
import '../widgets/punch_action_button.dart';
import '../widgets/shift_status_card.dart';
import '../widgets/today_timeline_card.dart';
import '../widgets/policy_snapshot_card.dart';
import '../widgets/workday_insights_card.dart';
import '../widgets/work_tools_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({
    super.key,
    required this.onCheckIn,
    required this.onHistory,
    required this.onRequests,
    required this.onProfile,
    required this.onNotifications,
    required this.onMore,
  });
  final VoidCallback onCheckIn;
  final VoidCallback onHistory;
  final VoidCallback onRequests;
  final VoidCallback onProfile;
  final VoidCallback onNotifications;
  final ValueChanged<String> onMore;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(homeControllerProvider);
    final summary = state.asData?.value;
    final attendance = ref.watch(attendanceControllerProvider).asData?.value;
    final tenant = ref.watch(tenantControllerProvider);
    final isCheckedIn =
        attendance?.phase == AttendancePhase.checkedIn ||
        attendance?.phase == AttendancePhase.onBreak ||
        (summary?.isCheckedIn ?? false);
    final isOnBreak = attendance?.phase == AttendancePhase.onBreak;
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 72,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.l10n.goodMorning,
              style: const TextStyle(
                color: AppTheme.slate,
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              summary?.employeeName ?? 'Employee',
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            onPressed: onNotifications,
            icon: const Icon(Icons.notifications_none_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: ref.read(homeControllerProvider.notifier).refresh,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              summary?.dateLabel ?? 'Loading today…',
              style: const TextStyle(
                color: AppTheme.slate,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            ShiftStatusCard(
              shiftLabel: summary?.shiftLabel ?? 'Resolving shift…',
              locationLabel: summary?.locationLabel ?? 'Resolving location…',
              isInsideZone: summary?.isInsideZone,
            ),
            const SizedBox(height: 14),
            PunchActionButton(isCheckedIn: isCheckedIn, onPressed: onCheckIn),
            const SizedBox(height: 16),
            HomeQuickActions(
              onHistory: onHistory,
              onRequests: onRequests,
              onProfile: onProfile,
              showRequests: tenant.hasModule(TenantModule.regularization),
            ),
            const SizedBox(height: 16),
            WorkToolsCard(
              isOnBreak: isOnBreak,
              showFieldTracking: tenant.hasModule(TenantModule.fieldTracking),
              onSelected: onMore,
            ),
            const SizedBox(height: 16),
            TodayTimelineCard(
              isCheckedIn: isCheckedIn,
              events: summary?.timeline ?? const [],
            ),
            const SizedBox(height: 16),
            WorkdayInsightsCard(overview: summary?.workOverview),
            const SizedBox(height: 16),
            PolicySnapshotCard(policy: summary?.policy),
            if (state.hasError) ...[
              const SizedBox(height: 12),
              const Text(
                'Could not refresh. Showing the last available attendance state.',
                style: TextStyle(color: Colors.redAccent),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

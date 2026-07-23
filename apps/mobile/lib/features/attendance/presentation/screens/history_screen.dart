import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../../domain/monthly_attendance_history.dart';
import '../attendance_controller.dart';
import '../widgets/attendance_calendar.dart';
import '../widgets/attendance_day_tile.dart';
import '../widgets/month_summary_card.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key, required this.onDay});
  final ValueChanged<String> onDay;

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);

  @override
  Widget build(BuildContext context) {
    final key = DateFormat('yyyy-MM').format(_month);
    final history = ref.watch(attendanceHistoryProvider(key));
    final attendance =
        history.asData?.value ?? MonthlyAttendanceHistory.empty(key);
    final recentDays =
        attendance.days
            .where(
              (day) =>
                  !day.isFuture &&
                  day.isApplicable &&
                  !const ['WORKING_DAY', 'UPCOMING'].contains(day.status),
            )
            .toList()
          ..sort((left, right) => right.date.compareTo(left.date));
    return AppPage(
      title: context.l10n.attendanceHistory,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Previous month',
                onPressed: () => setState(
                  () => _month = DateTime(_month.year, _month.month - 1),
                ),
                icon: const Icon(Icons.chevron_left_rounded),
              ),
              Expanded(
                child: Text(
                  DateFormat.yMMMM().format(_month),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Next month',
                onPressed:
                    _month.isBefore(
                      DateTime(DateTime.now().year, DateTime.now().month),
                    )
                    ? () => setState(
                        () => _month = DateTime(_month.year, _month.month + 1),
                      )
                    : null,
                icon: const Icon(Icons.chevron_right_rounded),
              ),
            ],
          ),
          const SizedBox(height: 12),
          MonthSummaryCard(summary: attendance.summary),
          const SizedBox(height: 14),
          AttendanceCalendar(
            month: _month,
            days: attendance.days,
            onDay: widget.onDay,
          ),
          const SizedBox(height: 20),
          const Text(
            'Recent days',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          if (!history.isLoading && recentDays.isEmpty)
            const AppCard(
              child: Text(
                'No completed attendance days are available for this month.',
                style: TextStyle(color: AppTheme.slate),
              ),
            ),
          for (final day in recentDays.take(10)) ...[
            AttendanceDayTile(
              day: day,
              onTap: day.canOpenDetails ? () => widget.onDay(day.date) : null,
            ),
            const SizedBox(height: 10),
          ],
          Row(
            children: [
              const Icon(Icons.info_outline, size: 15, color: AppTheme.slate),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  'Times are shown in ${attendance.timezone}. Locked payroll days cannot be corrected.',
                  style: const TextStyle(color: AppTheme.slate, fontSize: 11),
                ),
              ),
            ],
          ),
          if (history.isLoading)
            const Center(child: CircularProgressIndicator()),
          if (history.hasError)
            const Text('Attendance history could not be loaded.'),
        ],
      ),
    );
  }
}

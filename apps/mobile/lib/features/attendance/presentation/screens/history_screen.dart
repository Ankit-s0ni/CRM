import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../widgets/attendance_calendar.dart';
import '../widgets/attendance_day_tile.dart';
import '../widgets/month_summary_card.dart';
import '../attendance_controller.dart';

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
    final records = history.asData?.value ?? const <Map<String, dynamic>>[];
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
          MonthSummaryCard(records: records),
          const SizedBox(height: 14),
          AttendanceCalendar(
            month: _month,
            records: records,
            onDay: widget.onDay,
          ),
          const SizedBox(height: 20),
          const Text(
            'Recent days',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          for (final row in records.take(10)) ...[
            AttendanceDayTile(
              label: _rowLabel(row),
              onTap: () => widget.onDay(row['attendanceDate'] as String),
            ),
            const SizedBox(height: 10),
          ],
          const Row(
            children: [
              Icon(Icons.info_outline, size: 15, color: AppTheme.slate),
              SizedBox(width: 7),
              Expanded(
                child: Text(
                  'Times are shown in Asia/Muscat. Locked payroll days cannot be corrected.',
                  style: TextStyle(color: AppTheme.slate, fontSize: 11),
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

  String _rowLabel(Map<String, dynamic> row) {
    final date = DateTime.tryParse(row['attendanceDate'] as String? ?? '');
    final minutes = (row['totalWorkMinutes'] as num?)?.round() ?? 0;
    return '${date == null ? row['attendanceDate'] : DateFormat.MMMd().format(date)} · '
        '${row['attendanceStatus']} · ${minutes ~/ 60}h ${minutes % 60}m';
  }
}

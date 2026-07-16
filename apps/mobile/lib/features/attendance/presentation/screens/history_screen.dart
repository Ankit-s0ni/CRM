import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../widgets/attendance_calendar.dart';
import '../widgets/attendance_day_tile.dart';
import '../widgets/month_summary_card.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key, required this.onDay});
  final VoidCallback onDay;

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  int _month = 7;

  @override
  Widget build(BuildContext context) => AppPage(
    title: context.l10n.attendanceHistory,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            IconButton(
              onPressed: _month > 1 ? () => setState(() => _month--) : null,
              icon: const Icon(Icons.chevron_left_rounded),
            ),
            Expanded(
              child: Text(
                '${_months[_month - 1]} 2026',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            IconButton(
              onPressed: _month < 7 ? () => setState(() => _month++) : null,
              icon: const Icon(Icons.chevron_right_rounded),
            ),
          ],
        ),
        const SizedBox(height: 12),
        MonthSummaryCard(),
        const SizedBox(height: 14),
        AttendanceCalendar(onDay: widget.onDay),
        const SizedBox(height: 20),
        const Text(
          'Recent days',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        for (final row in const [
          '16 Jul · 09:12–Working · 7h 04m',
          '15 Jul · 09:04–18:02 · 8h 28m',
          '14 Jul · 09:21–18:03 · 8h 12m',
        ]) ...[
          AttendanceDayTile(label: row, onTap: widget.onDay),
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
      ],
    ),
  );

  static const _months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
  ];
}

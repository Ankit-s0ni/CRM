import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../../domain/monthly_attendance_history.dart';

class MonthSummaryCard extends StatelessWidget {
  const MonthSummaryCard({super.key, required this.summary});
  final AttendanceMonthSummary summary;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _Metric(
                value: '${summary.present}',
                label: context.l10n.present,
                color: AppTheme.green,
              ),
            ),
            Expanded(
              child: _Metric(
                value: '${summary.lateDays}',
                label: context.l10n.late,
                color: Color(0xFFD97706),
              ),
            ),
            Expanded(
              child: _Metric(
                value: '${summary.absent}',
                label: context.l10n.absent,
                color: AppTheme.danger,
              ),
            ),
            Expanded(
              child: _Metric(
                value: '${summary.leaveDays}',
                label: context.l10n.leave,
                color: Color(0xFF315B8A),
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        const Divider(),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _CompactMetric(
                icon: Icons.schedule_rounded,
                value: _minutes(summary.workMinutes),
                label: context.l10n.worked,
              ),
            ),
            Expanded(
              child: _CompactMetric(
                icon: Icons.trending_up_rounded,
                value: _minutes(summary.overtimeMinutes),
                label: context.l10n.overtime,
              ),
            ),
          ],
        ),
      ],
    ),
  );

  String _minutes(int minutes) {
    return '${minutes ~/ 60}h ${minutes % 60}m';
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.value,
    required this.label,
    required this.color,
  });
  final String value;
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(
        value,
        style: TextStyle(
          color: color,
          fontSize: 21,
          fontWeight: FontWeight.w900,
        ),
      ),
      const SizedBox(height: 3),
      Text(label, style: const TextStyle(color: AppTheme.slate, fontSize: 10)),
    ],
  );
}

class _CompactMetric extends StatelessWidget {
  const _CompactMetric({
    required this.icon,
    required this.value,
    required this.label,
  });
  final IconData icon;
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(icon, color: AppTheme.slate, size: 19),
      const SizedBox(width: 8),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppTheme.slate, fontSize: 10),
            ),
          ],
        ),
      ),
    ],
  );
}

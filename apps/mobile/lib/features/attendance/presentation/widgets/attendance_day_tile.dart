import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../domain/monthly_attendance_history.dart';
import 'attendance_status_style.dart';

class AttendanceDayTile extends StatelessWidget {
  const AttendanceDayTile({super.key, required this.day, this.onTap});
  final AttendanceCalendarDay day;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(day.date);
    final color = attendanceStatusColor(day.status);
    final status = day.label ?? attendanceStatusLabel(day.status);
    final worked =
        '${day.totalWorkMinutes ~/ 60}h ${day.totalWorkMinutes % 60}m';
    return AppCard(
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        onTap: onTap,
        leading: Container(
          width: 42,
          height: 42,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: color.withValues(alpha: .12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            date == null ? '--' : DateFormat.d().format(date),
            style: TextStyle(color: color, fontWeight: FontWeight.w900),
          ),
        ),
        title: Text(
          date == null ? day.date : DateFormat('EEEE, MMM d').format(date),
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          day.totalWorkMinutes > 0 ? '$status · $worked worked' : status,
          style: const TextStyle(color: AppTheme.slate),
        ),
        trailing: onTap == null ? null : const Icon(Icons.chevron_right),
      ),
    );
  }
}

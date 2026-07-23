import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../domain/monthly_attendance_history.dart';
import 'attendance_status_style.dart';

class AttendanceCalendar extends StatelessWidget {
  const AttendanceCalendar({
    super.key,
    required this.month,
    required this.days,
    required this.onDay,
  });
  final DateTime month;
  final List<AttendanceCalendarDay> days;
  final ValueChanged<String> onDay;

  @override
  Widget build(BuildContext context) {
    final daysByNumber = {for (final day in days) day.day: day};
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final offset = DateTime(month.year, month.month, 1).weekday % 7;
    return AppCard(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              for (final day in const ['S', 'M', 'T', 'W', 'T', 'F', 'S'])
                SizedBox(
                  width: 32,
                  child: Text(
                    day,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppTheme.slate,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: 5,
              crossAxisSpacing: 5,
            ),
            itemCount: ((offset + daysInMonth + 6) ~/ 7) * 7,
            itemBuilder: (context, index) {
              final day = index - offset + 1;
              if (day < 1 || day > daysInMonth) {
                return const SizedBox.shrink();
              }
              final calendarDay = daysByNumber[day];
              final status = calendarDay?.status ?? 'UPCOMING';
              final color = attendanceStatusColor(status);
              final date =
                  '${month.year}-${month.month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
              return Semantics(
                button: calendarDay?.canOpenDetails ?? false,
                label: '$date, ${attendanceStatusLabel(status)}',
                child: ExcludeSemantics(
                  child: InkWell(
                    onTap: calendarDay?.canOpenDetails ?? false
                        ? () => onDay(date)
                        : null,
                    borderRadius: BorderRadius.circular(10),
                    child: Ink(
                      decoration: BoxDecoration(
                        color: color.withValues(
                          alpha: status == 'NOT_APPLICABLE' ? .03 : .11,
                        ),
                        borderRadius: BorderRadius.circular(10),
                        border: calendarDay?.isToday ?? false
                            ? Border.all(color: AppTheme.charcoal, width: 1.5)
                            : status == 'WORKING_DAY'
                            ? Border.all(color: color.withValues(alpha: .28))
                            : null,
                      ),
                      child: Center(
                        child: MediaQuery.withNoTextScaling(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                '$day',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: status == 'NOT_APPLICABLE'
                                      ? AppTheme.slate.withValues(alpha: .5)
                                      : AppTheme.charcoal,
                                  fontWeight: calendarDay?.isToday ?? false
                                      ? FontWeight.w800
                                      : FontWeight.w500,
                                ),
                              ),
                              if (status != 'NOT_APPLICABLE')
                                Container(
                                  width: 4,
                                  height: 4,
                                  margin: const EdgeInsets.only(top: 3),
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          const Wrap(
            spacing: 12,
            runSpacing: 6,
            children: [
              _Legend(color: AppTheme.green, label: 'Present'),
              _Legend(color: Color(0xFFD97706), label: 'Late'),
              _Legend(color: AppTheme.danger, label: 'Absent'),
              _Legend(color: Color(0xFF315B8A), label: 'Leave'),
              _Legend(color: Color(0xFF7C3AED), label: 'Holiday'),
              _Legend(color: Color(0xFF64748B), label: 'Weekly off'),
              _Legend(color: Color(0xFF2563EB), label: 'Working day'),
            ],
          ),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label});
  final Color color;
  final String label;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 7,
        height: 7,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(color: AppTheme.slate, fontSize: 10)),
    ],
  );
}

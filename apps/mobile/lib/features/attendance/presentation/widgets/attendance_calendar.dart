import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';

class AttendanceCalendar extends StatelessWidget {
  const AttendanceCalendar({
    super.key,
    required this.month,
    required this.records,
    required this.onDay,
  });
  final DateTime month;
  final List<Map<String, dynamic>> records;
  final ValueChanged<String> onDay;

  @override
  Widget build(BuildContext context) {
    final statuses = <int, String>{};
    for (final record in records) {
      final date = DateTime.tryParse(record['attendanceDate'] as String? ?? '');
      if (date != null) {
        statuses[date.day] = record['attendanceStatus'] as String? ?? 'PRESENT';
      }
    }
    final days = DateTime(month.year, month.month + 1, 0).day;
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
            itemCount: ((offset + days + 6) ~/ 7) * 7,
            itemBuilder: (context, index) {
              final day = index - offset + 1;
              if (day < 1 || day > days) return const SizedBox.shrink();
              final status = statuses[day];
              final color = status == null ? null : _statusColor(status);
              final date =
                  '${month.year}-${month.month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
              return Semantics(
                button: status != null,
                label: status == null ? date : '$date, ${_statusLabel(status)}',
                child: ExcludeSemantics(
                  child: InkWell(
                    onTap: status == null ? null : () => onDay(date),
                    borderRadius: BorderRadius.circular(10),
                    child: Ink(
                      decoration: BoxDecoration(
                        color: color?.withValues(alpha: .11),
                        borderRadius: BorderRadius.circular(10),
                        border:
                            DateTime.now().year == month.year &&
                                DateTime.now().month == month.month &&
                                DateTime.now().day == day
                            ? Border.all(color: AppTheme.charcoal)
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
                                  fontWeight: day == 16
                                      ? FontWeight.w800
                                      : FontWeight.w500,
                                ),
                              ),
                              if (color != null)
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
            spacing: 14,
            runSpacing: 6,
            children: [
              _Legend(color: AppTheme.green, label: 'Present'),
              _Legend(color: Color(0xFFD97706), label: 'Late'),
              _Legend(color: AppTheme.danger, label: 'Absent'),
            ],
          ),
        ],
      ),
    );
  }
}

Color _statusColor(Object? status) {
  if (status == 'ABSENT') return AppTheme.danger;
  if (status == 'LATE' || status == 'HALF_DAY') return const Color(0xFFD97706);
  return AppTheme.green;
}

String _statusLabel(String status) => switch (status) {
  'ABSENT' => 'Absent',
  'LATE' => 'Late',
  'HALF_DAY' => 'Half day',
  _ => 'Present',
};

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

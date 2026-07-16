import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';

class AttendanceCalendar extends StatelessWidget {
  const AttendanceCalendar({super.key, required this.onDay});
  final VoidCallback onDay;

  @override
  Widget build(BuildContext context) {
    const statuses = <int, Color>{
      1: AppTheme.green,
      2: AppTheme.green,
      3: AppTheme.green,
      6: AppTheme.green,
      7: AppTheme.green,
      8: Color(0xFFD97706),
      9: AppTheme.green,
      10: AppTheme.green,
      13: AppTheme.green,
      14: AppTheme.green,
      15: AppTheme.danger,
      16: AppTheme.green,
    };
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
            itemCount: 35,
            itemBuilder: (context, index) {
              final day = index - 2;
              if (day < 1 || day > 31) return const SizedBox.shrink();
              final color = statuses[day];
              return InkWell(
                onTap: color == null ? null : onDay,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: color?.withValues(alpha: .11),
                    borderRadius: BorderRadius.circular(10),
                    border: day == 16
                        ? Border.all(color: AppTheme.charcoal)
                        : null,
                  ),
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

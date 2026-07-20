import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../../domain/home_summary.dart';

class WorkdayInsightsCard extends StatelessWidget {
  const WorkdayInsightsCard({super.key, required this.overview});

  final HomeWorkOverview? overview;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.l10n.weekOverview,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 14),
        if (overview == null)
          const Text(
            'Weekly attendance totals are not available yet.',
            style: TextStyle(color: AppTheme.slate, fontSize: 12),
          )
        else ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: overview!.targetMinutes <= 0
                  ? 0
                  : (overview!.workMinutes / overview!.targetMinutes).clamp(
                      0,
                      1,
                    ),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${_hours(overview!.workMinutes)} / ${_hours(overview!.targetMinutes)} h',
            style: const TextStyle(color: AppTheme.slate, fontSize: 12),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _Metric(
                  label: context.l10n.hoursWorked,
                  value: '${_hours(overview!.workMinutes)}h',
                  icon: Icons.schedule_rounded,
                ),
              ),
              Expanded(
                child: _Metric(
                  label: context.l10n.lateMinutes,
                  value: '${overview!.lateMinutes}m',
                  icon: Icons.timer_outlined,
                ),
              ),
              Expanded(
                child: _Metric(
                  label: context.l10n.overtime,
                  value: '${overview!.overtimeMinutes}m',
                  icon: Icons.trending_up_rounded,
                ),
              ),
            ],
          ),
        ],
      ],
    ),
  );
}

String _hours(int minutes) => (minutes / 60).toStringAsFixed(1);

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, required this.icon});
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Icon(icon, size: 19, color: AppTheme.slate),
      const SizedBox(height: 6),
      Text(
        value,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 2),
      Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(color: AppTheme.slate, fontSize: 10),
      ),
    ],
  );
}

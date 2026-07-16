import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class DaySummaryGrid extends StatelessWidget {
  const DaySummaryGrid({super.key});
  @override
  Widget build(BuildContext context) => AppCard(
    child: Row(
      children: [
        Expanded(
          child: _Summary(
            value: '8h 12m',
            label: context.l10n.worked,
            icon: Icons.schedule_rounded,
          ),
        ),
        Expanded(
          child: _Summary(
            value: '6m',
            label: context.l10n.late,
            icon: Icons.timer_outlined,
          ),
        ),
        Expanded(
          child: _Summary(
            value: '30m',
            label: context.l10n.breakLabel,
            icon: Icons.coffee_outlined,
          ),
        ),
      ],
    ),
  );
}

class _Summary extends StatelessWidget {
  const _Summary({
    required this.value,
    required this.label,
    required this.icon,
  });
  final String value;
  final String label;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Icon(icon, color: AppTheme.slate, size: 19),
      const SizedBox(height: 6),
      Text(
        value,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
      ),
      Text(label, style: const TextStyle(color: AppTheme.slate, fontSize: 10)),
    ],
  );
}

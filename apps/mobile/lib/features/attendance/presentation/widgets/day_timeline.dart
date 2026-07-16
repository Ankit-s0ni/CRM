import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../l10n/l10n_context.dart';

class DayTimeline extends StatelessWidget {
  const DayTimeline({super.key});

  @override
  Widget build(BuildContext context) => Column(
    children: [
      _TimelineEvent(
        icon: Icons.login,
        title: '09:21 · ${context.l10n.checkinLabel}',
        detail: context.l10n.faceDeviceVerified,
      ),
      _TimelineEvent(
        icon: Icons.free_breakfast,
        title: '13:00–13:30 · ${context.l10n.breakLabel}',
        detail: context.l10n.minutesValue(30),
      ),
      _TimelineEvent(
        icon: Icons.logout,
        title: '18:03 · ${context.l10n.checkoutLabel}',
        detail: context.l10n.savedOfflineSynced,
      ),
    ],
  );
}

class _TimelineEvent extends StatelessWidget {
  const _TimelineEvent({
    required this.icon,
    required this.title,
    required this.detail,
  });
  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: CircleAvatar(
      backgroundColor: AppTheme.green.withValues(alpha: .12),
      child: Icon(icon, color: AppTheme.green),
    ),
    title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
    subtitle: Text(detail),
  );
}

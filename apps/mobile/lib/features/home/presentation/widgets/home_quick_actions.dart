import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../l10n/l10n_context.dart';

class HomeQuickActions extends StatelessWidget {
  const HomeQuickActions({
    super.key,
    required this.onHistory,
    required this.onRequests,
    required this.onProfile,
    required this.showRequests,
  });

  final VoidCallback onHistory;
  final VoidCallback onRequests;
  final VoidCallback onProfile;
  final bool showRequests;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: _Action(
          icon: Icons.calendar_month_outlined,
          label: context.l10n.history,
          onTap: onHistory,
        ),
      ),
      if (showRequests) ...[
        const SizedBox(width: 10),
        Expanded(
          child: _Action(
            icon: Icons.article_outlined,
            label: context.l10n.requests,
            onTap: onRequests,
          ),
        ),
      ],
      const SizedBox(width: 10),
      Expanded(
        child: _Action(
          icon: Icons.person_outline_rounded,
          label: context.l10n.profile,
          onTap: onProfile,
        ),
      ),
    ],
  );
}

class _Action extends StatelessWidget {
  const _Action({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: const BorderSide(color: AppTheme.line),
    ),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Column(
          children: [
            Icon(icon, size: 21, color: AppTheme.charcoal),
            const SizedBox(height: 7),
            Text(
              label,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    ),
  );
}

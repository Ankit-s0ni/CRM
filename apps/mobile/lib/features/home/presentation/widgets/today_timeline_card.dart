import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class TodayTimelineCard extends StatelessWidget {
  const TodayTimelineCard({super.key, required this.isCheckedIn});
  final bool isCheckedIn;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                context.l10n.todaysActivity,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              context.l10n.viewDetails,
              style: TextStyle(
                color: Theme.of(context).colorScheme.secondary,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppTheme.green.withValues(alpha: .1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.login_rounded,
                color: AppTheme.green,
                size: 20,
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isCheckedIn
                        ? context.l10n.checkedInAt('09:12')
                        : context.l10n.readyWhenYouAre,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    isCheckedIn
                        ? context.l10n.workingTimeTracked
                        : context.l10n.firstActivityHere,
                    style: const TextStyle(color: AppTheme.slate, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

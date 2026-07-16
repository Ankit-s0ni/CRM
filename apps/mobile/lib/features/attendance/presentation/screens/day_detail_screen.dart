import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../widgets/day_timeline.dart';
import '../widgets/day_summary_grid.dart';
import '../widgets/verification_evidence_card.dart';
import '../../../../l10n/l10n_context.dart';

class DayDetailScreen extends StatelessWidget {
  const DayDetailScreen({super.key, required this.onCorrection});
  final VoidCallback onCorrection;

  @override
  Widget build(BuildContext context) => AppPage(
    title:
        '${DateFormat.MMMd(Localizations.localeOf(context).languageCode).format(DateTime(2026, 7, 8))} · ${context.l10n.dayDetail}',
    back: true,
    child: Column(
      children: [
        const DaySummaryGrid(),
        const SizedBox(height: 14),
        const AppCard(child: DayTimeline()),
        const SizedBox(height: 14),
        const VerificationEvidenceCard(),
        const SizedBox(height: 14),
        const AppCard(
          child: Row(
            children: [
              Icon(Icons.lock_outline_rounded),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Payroll status: Open\nCorrections allowed until 23 July',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        PrimaryButton(
          label: context.l10n.requestCorrection,
          onPressed: onCorrection,
        ),
      ],
    ),
  );
}

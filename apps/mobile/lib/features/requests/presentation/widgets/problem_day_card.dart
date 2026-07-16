import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class ProblemDayCard extends StatelessWidget {
  const ProblemDayCard({super.key});

  @override
  Widget build(BuildContext context) => AppCard(
    child: ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.error_outline, color: Colors.redAccent),
      title: Text('5 Jul — ${context.l10n.missingCheckout}'),
      subtitle: Text(context.l10n.requestsSevenDays),
    ),
  );
}

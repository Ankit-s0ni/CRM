import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class ConsentPolicyCard extends StatelessWidget {
  const ConsentPolicyCard({super.key});
  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.l10n.consentDataTitle,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        Text(context.l10n.consentDataBody),
        const SizedBox(height: 12),
        Text(
          context.l10n.consentUseTitle,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        Text(context.l10n.consentUseBody),
        const SizedBox(height: 12),
        const Text('Policy v1.2'),
      ],
    ),
  );
}

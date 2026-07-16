import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class VerificationFailureCard extends StatelessWidget {
  const VerificationFailureCard({
    super.key,
    required this.title,
    required this.code,
    required this.onRetry,
  });
  final String title;
  final String code;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => AppCard(
    child: ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.warning_amber_rounded, color: Colors.red),
      title: Text(title),
      subtitle: Text(code),
      trailing: TextButton(onPressed: onRetry, child: Text(context.l10n.retry)),
    ),
  );
}

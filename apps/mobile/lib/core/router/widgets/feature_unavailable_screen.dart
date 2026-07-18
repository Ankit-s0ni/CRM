import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

class FeatureUnavailableScreen extends StatelessWidget {
  const FeatureUnavailableScreen({
    super.key,
    required this.title,
    required this.message,
    required this.onBack,
  });

  final String title;
  final String message;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(leading: BackButton(onPressed: onBack)),
    body: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            children: [
              const Icon(
                Icons.lock_outline_rounded,
                color: AppTheme.slate,
                size: 58,
              ),
              const SizedBox(height: 18),
              Text(
                title,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 10),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: onBack,
                child: const Text('Back to home'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

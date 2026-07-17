import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../network/api_availability.dart';
import '../network/api_availability_provider.dart';
import '../network/network_providers.dart';
import '../router/app_routes.dart';
import '../theme/app_theme.dart';

class AppAvailabilityGate extends ConsumerWidget {
  const AppAvailabilityGate({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final event = ref.watch(apiAvailabilityProvider).asData?.value;
    return switch (event?.state) {
      ApiAvailability.sessionExpired => _BlockingAvailability(
        icon: Icons.lock_clock_outlined,
        title: 'Your session has expired',
        message: 'Sign in again to continue securely.',
        actionLabel: 'Sign in again',
        onPressed: () async {
          await ref.read(apiServiceProvider).clearSession();
          if (context.mounted) context.go(AppRoutes.login);
        },
      ),
      ApiAvailability.workspaceUnavailable => _BlockingAvailability(
        icon: Icons.domain_disabled_outlined,
        title: 'Workspace unavailable',
        message:
            event?.message ??
            'This workspace is suspended or temporarily unavailable.',
        actionLabel: 'Back to sign in',
        onPressed: () => context.go(AppRoutes.login),
      ),
      ApiAvailability.offline => _AvailabilityBanner(
        icon: Icons.cloud_off_outlined,
        message: 'You are offline. Showing the last available information.',
        child: child,
      ),
      ApiAvailability.providerUnavailable => _AvailabilityBanner(
        icon: Icons.shield_outlined,
        message: 'Verification is temporarily unavailable. Please retry.',
        child: child,
      ),
      _ => child,
    };
  }
}

class _AvailabilityBanner extends StatelessWidget {
  const _AvailabilityBanner({
    required this.icon,
    required this.message,
    required this.child,
  });

  final IconData icon;
  final String message;
  final Widget child;

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      child,
      Positioned(
        top: MediaQuery.paddingOf(context).top + 8,
        left: 16,
        right: 16,
        child: Material(
          color: AppTheme.charcoal,
          borderRadius: BorderRadius.circular(12),
          elevation: 8,
          child: Semantics(
            liveRegion: true,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Icon(icon, color: Colors.white),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      message,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

class _BlockingAvailability extends StatelessWidget {
  const _BlockingAvailability({
    required this.icon,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onPressed,
  });

  final IconData icon;
  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              children: [
                Icon(icon, size: 64, color: AppTheme.danger),
                const SizedBox(height: 20),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 10),
                Text(message, textAlign: TextAlign.center),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton(
                    onPressed: onPressed,
                    child: Text(actionLabel),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

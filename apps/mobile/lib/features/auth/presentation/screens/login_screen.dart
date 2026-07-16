import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../auth_controller.dart';
import '../widgets/company_mark.dart';
import '../widgets/login_form.dart';
import '../../../../l10n/l10n_context.dart';

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key, required this.onSignIn});
  final Future<void> Function(String identifier, String password) onSignIn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const CompanyMark(),
                  const SizedBox(height: 54),
                  Text(
                    context.l10n.signInTitle,
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    context.l10n.signInSubtitle,
                    style: Theme.of(
                      context,
                    ).textTheme.bodyLarge?.copyWith(color: AppTheme.slate),
                  ),
                  const SizedBox(height: 34),
                  LoginForm(
                    isLoading: auth.isLoading,
                    onSubmit: onSignIn,
                    onForgotPassword: () => AppFeedback.information(
                      context: context,
                      title: context.l10n.resetPassword,
                      message: context.l10n.resetPasswordHelp,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 7,
                    children: [
                      const Icon(
                        Icons.shield_outlined,
                        size: 16,
                        color: AppTheme.slate,
                      ),
                      Text(
                        context.l10n.protectedWorkspace,
                        style: const TextStyle(color: AppTheme.slate),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

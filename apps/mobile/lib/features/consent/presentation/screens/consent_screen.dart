import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../consent_controller.dart';
import '../widgets/consent_policy_card.dart';
import '../../../../l10n/l10n_context.dart';

class ConsentScreen extends ConsumerStatefulWidget {
  const ConsentScreen({
    super.key,
    required this.onAccept,
    required this.onDecline,
    required this.onContinue,
    required this.onWithdraw,
  });
  final VoidCallback onAccept, onDecline, onContinue, onWithdraw;
  @override
  ConsumerState<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends ConsumerState<ConsentScreen> {
  bool accepted = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(consentControllerProvider);
    final consent = state.asData?.value;
    final active = consent?['active'] == true;
    return AppPage(
      title: context.l10n.faceConsent,
      child: Column(
        children: [
          Icon(
            active
                ? Icons.verified_user_rounded
                : Icons.face_retouching_natural_outlined,
            size: 72,
            color: active ? AppTheme.green : AppTheme.charcoal,
          ),
          const SizedBox(height: 16),
          const ConsentPolicyCard(),
          if (state.isLoading) ...[
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
          ] else if (state.hasError) ...[
            const SizedBox(height: 16),
            const Text(
              'Consent status could not be loaded. Try again before continuing.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.danger),
            ),
          ] else if (active) ...[
            const SizedBox(height: 16),
            StatusChip(
              label:
                  'CONSENT ACTIVE • POLICY ${consent?['policyVersion'] ?? '1.2'}',
            ),
            const SizedBox(height: 18),
            PrimaryButton(
              label: 'Continue to face enrollment',
              icon: Icons.arrow_forward_rounded,
              onPressed: widget.onContinue,
            ),
            TextButton(
              onPressed: widget.onWithdraw,
              child: const Text(
                'Withdraw biometric consent',
                style: TextStyle(color: AppTheme.danger),
              ),
            ),
          ] else ...[
            CheckboxListTile(
              value: accepted,
              onChanged: (value) => setState(() => accepted = value ?? false),
              title: Text(context.l10n.consentAgreement),
            ),
            PrimaryButton(
              label: context.l10n.giveConsent,
              onPressed: accepted ? widget.onAccept : null,
            ),
            TextButton(
              onPressed: () async {
                final proceed = await AppFeedback.confirm(
                  context: context,
                  title: context.l10n.continueWithoutFace,
                  message: context.l10n.continueWithoutFaceWarning,
                  confirmLabel: context.l10n.continueWithGps,
                );
                if (proceed && context.mounted) widget.onDecline();
              },
              child: Text(context.l10n.declineGps),
            ),
          ],
        ],
      ),
    );
  }
}

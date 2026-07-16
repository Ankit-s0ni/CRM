import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../widgets/consent_policy_card.dart';
import '../../../../l10n/l10n_context.dart';

class ConsentScreen extends StatefulWidget {
  const ConsentScreen({
    super.key,
    required this.onAccept,
    required this.onDecline,
  });
  final VoidCallback onAccept, onDecline;
  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  bool accepted = false;
  @override
  Widget build(BuildContext context) => AppPage(
    title: context.l10n.faceConsent,
    child: Column(
      children: [
        const Icon(Icons.face_retouching_natural_outlined, size: 72),
        const SizedBox(height: 16),
        const ConsentPolicyCard(),
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
    ),
  );
}

import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class VerificationEvidenceCard extends StatelessWidget {
  const VerificationEvidenceCard({super.key});
  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.l10n.verificationEvidenceTitle,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        _Evidence(
          icon: Icons.face_retouching_natural_outlined,
          label: context.l10n.faceLiveness,
          value: context.l10n.verified,
        ),
        _Evidence(
          icon: Icons.phone_android_rounded,
          label: context.l10n.registeredDevice,
          value: context.l10n.active,
        ),
        _Evidence(
          icon: Icons.location_on_outlined,
          label: context.l10n.locationStatus,
          value: '±8 m',
        ),
        _Evidence(
          icon: Icons.security_rounded,
          label: context.l10n.integrity,
          value: context.l10n.passed,
          last: true,
        ),
      ],
    ),
  );
}

class _Evidence extends StatelessWidget {
  const _Evidence({
    required this.icon,
    required this.label,
    required this.value,
    this.last = false,
  });
  final IconData icon;
  final String label;
  final String value;
  final bool last;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10),
    decoration: BoxDecoration(
      border: last
          ? null
          : const Border(bottom: BorderSide(color: AppTheme.line)),
    ),
    child: Row(
      children: [
        Icon(icon, color: AppTheme.slate, size: 18),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: const TextStyle(fontSize: 12))),
        const Icon(Icons.check_circle_rounded, color: AppTheme.green, size: 16),
        const SizedBox(width: 5),
        Text(
          value,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
        ),
      ],
    ),
  );
}

import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../l10n/l10n_context.dart';

class PunchActionButton extends StatelessWidget {
  const PunchActionButton({
    super.key,
    required this.isCheckedIn,
    required this.onPressed,
  });
  final bool isCheckedIn;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: isCheckedIn
        ? context.l10n.cameraCheckOut
        : context.l10n.cameraCheckIn,
    child: SizedBox(
      width: double.infinity,
      height: 58,
      child: FilledButton.icon(
        onPressed: onPressed,
        icon: Icon(
          isCheckedIn ? Icons.logout_rounded : Icons.fingerprint_rounded,
        ),
        style: FilledButton.styleFrom(
          backgroundColor: AppTheme.charcoal,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
        ),
        label: Text(
          isCheckedIn ? context.l10n.checkOutToday : context.l10n.checkInToday,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
        ),
      ),
    ),
  );
}

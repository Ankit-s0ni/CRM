import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../device_controller.dart';
import '../widgets/detected_device_card.dart';
import '../../../../l10n/l10n_context.dart';

class DeviceRegistrationScreen extends ConsumerWidget {
  const DeviceRegistrationScreen({
    super.key,
    required this.onRegister,
    required this.onContinue,
  });
  final VoidCallback onRegister;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(deviceControllerProvider);
    final device = state.asData?.value;
    final status = device?['status'] as String?;
    return AppPage(
      title: context.l10n.registerDevice,
      child: Column(
        children: [
          Icon(_icon(status), size: 72, color: _color(status)),
          const SizedBox(height: 20),
          Text(
            _message(context, status),
            textAlign: TextAlign.center,
            style: const TextStyle(height: 1.5),
          ),
          const SizedBox(height: 20),
          DetectedDeviceCard(device: device),
          if (status != null) ...[
            const SizedBox(height: 16),
            StatusChip(
              label: status.replaceAll('_', ' '),
              color: _color(status),
            ),
          ],
          const SizedBox(height: 24),
          if (state.isLoading)
            const CircularProgressIndicator()
          else if (status == 'ACTIVE')
            PrimaryButton(
              label: 'Continue securely',
              icon: Icons.arrow_forward_rounded,
              onPressed: onContinue,
            )
          else if (status != 'PENDING_APPROVAL' &&
              status != 'BLOCKED' &&
              status != 'REPLACED')
            PrimaryButton(
              label: context.l10n.registerDeviceAction,
              onPressed: onRegister,
            ),
        ],
      ),
    );
  }

  IconData _icon(String? status) => switch (status) {
    'ACTIVE' => Icons.verified_user_rounded,
    'PENDING_APPROVAL' => Icons.hourglass_top_rounded,
    'BLOCKED' || 'REPLACED' => Icons.phonelink_erase_rounded,
    _ => Icons.shield_outlined,
  };

  Color _color(String? status) => switch (status) {
    'ACTIVE' => AppTheme.green,
    'BLOCKED' || 'REPLACED' => AppTheme.danger,
    _ => AppTheme.charcoal,
  };

  String _message(BuildContext context, String? status) => switch (status) {
    'ACTIVE' => 'This device is approved and ready for secure attendance.',
    'PENDING_APPROVAL' =>
      'Registration is complete. Your HR team must approve this device before attendance can be recorded.',
    'BLOCKED' =>
      'This device has been blocked by your organization. Contact HR for assistance.',
    'REPLACED' =>
      'This device has been replaced and can no longer record attendance.',
    _ => context.l10n.devicePolicy,
  };
}

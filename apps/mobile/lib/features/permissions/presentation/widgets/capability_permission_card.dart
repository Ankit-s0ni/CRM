import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../domain/app_capability.dart';
import '../../../../l10n/l10n_context.dart';

class CapabilityPermissionCard extends StatelessWidget {
  const CapabilityPermissionCard({
    super.key,
    required this.capability,
    required this.status,
    required this.onRequest,
  });
  final AppCapability capability;
  final CapabilityStatus status;
  final VoidCallback? onRequest;

  @override
  Widget build(BuildContext context) {
    final info = _info(context, capability);
    final granted =
        status == CapabilityStatus.granted ||
        (status == CapabilityStatus.limited &&
            capability != AppCapability.locationWhileUsing);
    final requiresSettings =
        status == CapabilityStatus.permanentlyDenied ||
        status == CapabilityStatus.restricted ||
        status == CapabilityStatus.limited;
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(info.icon, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  info.title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(info.rationale),
                const SizedBox(height: 9),
                StatusChip(
                  label: _statusLabel(context, status),
                  color: granted ? Colors.green : Colors.orange,
                ),
              ],
            ),
          ),
          if (!granted && onRequest != null)
            TextButton(
              onPressed: onRequest,
              child: Text(
                requiresSettings
                    ? context.l10n.openSettings
                    : context.l10n.enable,
              ),
            ),
        ],
      ),
    );
  }

  ({String title, String rationale, IconData icon}) _info(
    BuildContext context,
    AppCapability capability,
  ) => switch (capability) {
    AppCapability.camera => (
      title: context.l10n.camera,
      rationale: context.l10n.cameraRationale,
      icon: Icons.camera_alt_outlined,
    ),
    AppCapability.locationWhileUsing => (
      title: context.l10n.preciseLocation,
      rationale: context.l10n.locationRationale,
      icon: Icons.location_on_outlined,
    ),
    AppCapability.backgroundLocation => (
      title: context.l10n.backgroundLocation,
      rationale: context.l10n.backgroundLocationRationale,
      icon: Icons.route_outlined,
    ),
    AppCapability.notifications => (
      title: context.l10n.notifications,
      rationale: context.l10n.notificationRationale,
      icon: Icons.notifications_outlined,
    ),
    AppCapability.batteryOptimization => (
      title: context.l10n.batteryOptimization,
      rationale: context.l10n.batteryRationale,
      icon: Icons.battery_saver_outlined,
    ),
  };

  String _statusLabel(BuildContext context, CapabilityStatus status) =>
      switch (status) {
        CapabilityStatus.granted => context.l10n.allowed,
        CapabilityStatus.limited => context.l10n.limited,
        CapabilityStatus.denied => context.l10n.notAllowed,
        CapabilityStatus.permanentlyDenied => context.l10n.openSettings,
        CapabilityStatus.restricted => context.l10n.restricted,
        CapabilityStatus.unavailable => context.l10n.notAvailable,
      };
}

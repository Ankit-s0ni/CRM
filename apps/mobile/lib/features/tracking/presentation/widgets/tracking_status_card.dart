import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';

class TrackingStatusCard extends StatelessWidget {
  const TrackingStatusCard({
    super.key,
    required this.active,
    required this.backgroundPermission,
    required this.batteryLevel,
    this.startedAt,
  });

  final bool active;
  final String backgroundPermission;
  final int? batteryLevel;
  final DateTime? startedAt;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(
            active
                ? Icons.location_searching_rounded
                : Icons.location_disabled_outlined,
          ),
          title: Text(
            active ? 'Field tracking is active' : 'Field tracking is off',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          subtitle: Text(
            active && startedAt != null
                ? 'Started ${_relative(startedAt!)} · battery-aware capture'
                : 'Start only when beginning field work',
          ),
          trailing: StatusChip(
            label: active ? 'Live' : 'Stopped',
            color: active ? AppTheme.green : Colors.grey,
          ),
        ),
        const Divider(),
        Row(
          children: [
            Expanded(
              child: _Capability(
                icon: Icons.my_location_rounded,
                label: 'Background location',
                value: backgroundPermission,
                good: backgroundPermission == 'GRANTED',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Capability(
                icon: Icons.battery_5_bar_rounded,
                label: 'Battery',
                value: batteryLevel == null ? 'Unknown' : '$batteryLevel%',
                good: batteryLevel == null || batteryLevel! > 20,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          active
              ? 'Locations are queued securely at policy intervals and tracking stops automatically at check-out.'
              : 'Your location is not being collected.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppTheme.slate, fontSize: 12),
        ),
      ],
    ),
  );
}

class _Capability extends StatelessWidget {
  const _Capability({
    required this.icon,
    required this.label,
    required this.value,
    required this.good,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool good;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: const Color(0xFFF4F2F7),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      children: [
        Icon(icon, size: 18, color: good ? AppTheme.green : AppTheme.warmText),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 10)),
              Text(
                value,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

String _relative(DateTime value) {
  final minutes = DateTime.now().difference(value.toLocal()).inMinutes;
  if (minutes < 1) return 'just now';
  if (minutes < 60) return '${minutes}m ago';
  return '${minutes ~/ 60}h ago';
}

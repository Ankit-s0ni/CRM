import 'package:flutter/material.dart';

import '../../../../core/tenant/tenant_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class PolicySnapshotCard extends StatelessWidget {
  const PolicySnapshotCard({
    super.key,
    required this.policy,
    required this.nextHoliday,
  });
  final AttendancePolicyConfig policy;
  final String nextHoliday;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                context.l10n.policySnapshot,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            const StatusChip(label: 'HYBRID'),
          ],
        ),
        const SizedBox(height: 14),
        _PolicyRow(
          icon: Icons.badge_outlined,
          label: context.l10n.workPolicy,
          value: policy.name,
        ),
        _PolicyRow(
          icon: Icons.location_on_outlined,
          label: context.l10n.locationStatus,
          value: context.l10n.insideOfficeZone,
        ),
        _PolicyRow(
          icon: Icons.radar_rounded,
          label: 'Geofence',
          value:
              '${policy.geofenceRadiusMeters} m · GPS ±${policy.locationAccuracyMeters} m',
        ),
        _PolicyRow(
          icon: Icons.event_outlined,
          label: context.l10n.nextHoliday,
          value: nextHoliday,
          last: true,
        ),
      ],
    ),
  );
}

class _PolicyRow extends StatelessWidget {
  const _PolicyRow({
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
    padding: const EdgeInsets.symmetric(vertical: 11),
    decoration: BoxDecoration(
      border: last
          ? null
          : const Border(bottom: BorderSide(color: AppTheme.line)),
    ),
    child: Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.slate),
        const SizedBox(width: 11),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(color: AppTheme.slate, fontSize: 12),
          ),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    ),
  );
}

import 'package:flutter/material.dart';

import '../../../../core/widgets/app_widgets.dart';

class TrackingStatusCard extends StatelessWidget {
  const TrackingStatusCard({super.key, required this.active});
  final bool active;

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
            active
                ? 'Started just now · battery impact low'
                : 'Start only when beginning field work',
          ),
          trailing: StatusChip(
            label: active ? 'Live' : 'Stopped',
            color: active ? const Color(0xFF238B68) : Colors.grey,
          ),
        ),
        const Divider(),
        Text(
          active
              ? 'Location is recorded at policy intervals and stops automatically at check-out.'
              : 'Your location is not being collected.',
          textAlign: TextAlign.center,
        ),
      ],
    ),
  );
}

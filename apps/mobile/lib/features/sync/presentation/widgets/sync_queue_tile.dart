import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';

class SyncQueueTile extends StatelessWidget {
  const SyncQueueTile({super.key, required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const StatusChip(label: 'Saved offline'),
      ],
    ),
  );
}

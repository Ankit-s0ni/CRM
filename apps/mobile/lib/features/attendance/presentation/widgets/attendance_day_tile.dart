import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';

class AttendanceDayTile extends StatelessWidget {
  const AttendanceDayTile({
    super.key,
    required this.label,
    required this.onTap,
  });
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => AppCard(
    child: ListTile(
      contentPadding: EdgeInsets.zero,
      onTap: onTap,
      title: Text(label),
      trailing: const Icon(Icons.chevron_right),
    ),
  );
}

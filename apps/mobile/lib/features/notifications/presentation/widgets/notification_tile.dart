import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';

class NotificationTile extends StatelessWidget {
  const NotificationTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle = 'Today',
    this.unread = false,
    this.onTap,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final bool unread;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => AppCard(
    child: ListTile(
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
      subtitle: Text(subtitle),
      trailing: unread ? const CircleAvatar(radius: 4) : null,
    ),
  );
}

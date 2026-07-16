import 'package:flutter/material.dart';

import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../widgets/notification_tile.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final Set<int> _unread = {0, 1};

  void _read(int index) {
    if (_unread.contains(index)) setState(() => _unread.remove(index));
  }

  void _readAll() {
    if (_unread.isEmpty) {
      AppFeedback.success(context, context.l10n.allCaughtUp);
      return;
    }
    setState(_unread.clear);
    AppFeedback.success(context, context.l10n.allRead);
  }

  @override
  Widget build(BuildContext context) {
    final items = <({IconData icon, String title, String subtitle})>[
      (
        icon: Icons.check_circle_outline_rounded,
        title: context.l10n.notificationApproved,
        subtitle: '${context.l10n.today} · 10:24',
      ),
      (
        icon: Icons.alarm_rounded,
        title: context.l10n.notificationShiftEnd,
        subtitle: '${context.l10n.today} · 17:45',
      ),
      (
        icon: Icons.location_on_outlined,
        title: context.l10n.notificationOfficeZone,
        subtitle: '${context.l10n.yesterday} · 08:52',
      ),
      (
        icon: Icons.cloud_done_outlined,
        title: context.l10n.notificationSynced,
        subtitle: '${context.l10n.monday} · 09:18',
      ),
    ];
    return AppPage(
      title: context.l10n.notifications,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  context.l10n.notificationsUnread(_unread.length),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              TextButton.icon(
                onPressed: _readAll,
                icon: const Icon(Icons.done_all_rounded),
                label: Text(context.l10n.markAllRead),
              ),
            ],
          ),
          const SizedBox(height: 10),
          for (var index = 0; index < items.length; index++) ...[
            NotificationTile(
              icon: items[index].icon,
              title: items[index].title,
              subtitle: items[index].subtitle,
              unread: _unread.contains(index),
              onTap: () => _read(index),
            ),
            if (index != items.length - 1) const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
}

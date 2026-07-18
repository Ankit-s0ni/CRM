import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../../data/notifications_api_repository.dart';
import '../widgets/notification_tile.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key, required this.onOpenAction});

  final void Function(String? actionUrl) onOpenAction;

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  late Future<List<Map<String, dynamic>>> _notifications;

  @override
  void initState() {
    super.initState();
    _notifications = _load();
  }

  Future<List<Map<String, dynamic>>> _load() =>
      ref.read(notificationsRepositoryProvider).list();

  void _reload() => setState(() => _notifications = _load());

  Future<void> _read(Map<String, dynamic> item) async {
    try {
      if (item['isRead'] != true) {
        await ref
            .read(notificationsRepositoryProvider)
            .markRead('${item['id']}');
      }
      if (!mounted) return;
      _reload();
      widget.onOpenAction(item['actionUrl'] as String?);
    } catch (_) {
      if (mounted) {
        AppFeedback.error(context, 'This notification could not be opened.');
      }
    }
  }

  Future<void> _readAll() async {
    try {
      await ref.read(notificationsRepositoryProvider).markAllRead();
      if (!mounted) return;
      AppFeedback.success(context, context.l10n.allRead);
      _reload();
    } catch (_) {
      if (mounted) {
        AppFeedback.error(context, 'Notifications could not be updated.');
      }
    }
  }

  @override
  Widget build(BuildContext context) => AppPage(
    title: context.l10n.notifications,
    back: true,
    child: FutureBuilder<List<Map<String, dynamic>>>(
      future: _notifications,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return AppCard(
            child: Column(
              children: [
                const Text('Notifications could not be loaded.'),
                TextButton.icon(
                  onPressed: _reload,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try again'),
                ),
              ],
            ),
          );
        }
        final items = snapshot.data ?? const <Map<String, dynamic>>[];
        final unread = items.where((item) => item['isRead'] != true).length;
        return Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    context.l10n.notificationsUnread(unread),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                TextButton.icon(
                  onPressed: unread == 0 ? null : _readAll,
                  icon: const Icon(Icons.done_all_rounded),
                  label: Text(context.l10n.markAllRead),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (items.isEmpty)
              const EmptyState(
                title: 'You are all caught up.',
                icon: Icons.notifications_none_rounded,
              ),
            for (var index = 0; index < items.length; index++) ...[
              NotificationTile(
                icon: _icon('${items[index]['eventKey']}'),
                title: '${items[index]['title'] ?? 'Notification'}',
                body: '${items[index]['body'] ?? ''}',
                subtitle: _createdAt(items[index]['createdAt']),
                unread: items[index]['isRead'] != true,
                onTap: () => _read(items[index]),
              ),
              if (index != items.length - 1) const SizedBox(height: 10),
            ],
          ],
        );
      },
    ),
  );
}

IconData _icon(String eventKey) {
  if (eventKey.startsWith('leave.')) return Icons.beach_access_outlined;
  if (eventKey.startsWith('regularization.')) {
    return Icons.edit_calendar_outlined;
  }
  if (eventKey.startsWith('security.')) return Icons.gpp_maybe_outlined;
  return Icons.notifications_none_rounded;
}

String _createdAt(Object? raw) {
  final date = DateTime.tryParse('$raw')?.toLocal();
  return date == null
      ? 'Time unavailable'
      : DateFormat.yMMMd().add_jm().format(date);
}

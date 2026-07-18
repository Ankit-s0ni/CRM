import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../sync_controller.dart';
import '../widgets/sync_queue_tile.dart';

class SyncScreen extends ConsumerStatefulWidget {
  const SyncScreen({super.key});

  @override
  ConsumerState<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends ConsumerState<SyncScreen> {
  bool _syncing = false;

  Future<void> _sync([String? eventId]) async {
    if (_syncing) return;
    setState(() => _syncing = true);
    final success = await ref
        .read(syncControllerProvider.notifier)
        .syncNow(clientEventUuid: eventId);
    if (!mounted) return;
    setState(() => _syncing = false);
    if (success) {
      AppFeedback.success(context, 'Attendance records are up to date.');
    } else {
      AppFeedback.error(
        context,
        'Sync is still waiting for a secure connection. Your records remain saved.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final queue = ref.watch(syncControllerProvider);
    final items = queue.valueOrNull ?? const [];
    final pending = items
        .where((item) => item.status == 'PENDING' || item.status == 'RETRYABLE')
        .toList();
    final failed = items.where((item) => item.status == 'REJECTED').toList();
    final synced = items.where((item) => item.status == 'SYNCED').toList();
    final allSynced = pending.isEmpty && failed.isEmpty;

    return AppPage(
      title: context.l10n.offlineSync,
      child: Column(
        children: [
          AppCard(
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: (allSynced ? AppTheme.green : AppTheme.warmText)
                        .withValues(alpha: .1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    allSynced
                        ? Icons.cloud_done_rounded
                        : Icons.cloud_off_outlined,
                    color: allSynced ? AppTheme.green : AppTheme.warmText,
                  ),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        allSynced
                            ? context.l10n.everythingSynced
                            : '${pending.length} waiting · ${failed.length} need attention',
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        synced.isEmpty
                            ? 'Saved securely on this device'
                            : 'Last synced ${DateFormat.jm().format(synced.first.createdAt.toLocal())}',
                        style: const TextStyle(
                          color: AppTheme.slate,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (queue.isLoading) ...[
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
          ],
          if (queue.hasError) ...[
            const SizedBox(height: 12),
            const Text('The local sync queue could not be opened.'),
          ],
          if (!allSynced) ...[
            const SizedBox(height: 12),
            for (final item in [...pending, ...failed]) ...[
              SyncQueueTile(
                item: item,
                onRetry: item.canRetry && !_syncing
                    ? () => _sync(item.clientEventUuid)
                    : null,
              ),
              const SizedBox(height: 12),
            ],
            if (pending.isNotEmpty)
              PrimaryButton(
                label: _syncing ? 'Syncing securely…' : context.l10n.syncNow,
                icon: _syncing ? null : Icons.sync_rounded,
                onPressed: _syncing ? null : _sync,
              ),
          ],
          if (allSynced && synced.isNotEmpty) ...[
            const SizedBox(height: 18),
            Text(
              '${synced.length} recent record${synced.length == 1 ? '' : 's'} synced safely.',
              style: const TextStyle(color: AppTheme.slate),
            ),
          ],
          const SizedBox(height: 16),
          const Text(
            'Original punch times remain unchanged and are verified when the connection returns.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.slate, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

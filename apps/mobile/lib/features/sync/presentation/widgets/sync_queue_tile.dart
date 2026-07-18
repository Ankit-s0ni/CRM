import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../domain/sync_repository.dart';

class SyncQueueTile extends StatelessWidget {
  const SyncQueueTile({super.key, required this.item, required this.onRetry});

  final SyncQueueItem item;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final color = switch (item.status) {
      'SYNCED' => AppTheme.green,
      'REJECTED' => Colors.red.shade700,
      'RETRYABLE' => AppTheme.warmText,
      _ => AppTheme.charcoal,
    };
    final icon = switch (item.status) {
      'SYNCED' => Icons.cloud_done_outlined,
      'REJECTED' => Icons.error_outline_rounded,
      'RETRYABLE' => Icons.sync_problem_outlined,
      _ => Icons.cloud_upload_outlined,
    };
    return AppCard(
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_label(item.eventType)} · ${DateFormat.jm().format(item.createdAt.toLocal())}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 5),
                StatusChip(label: _statusLabel(item), color: color),
                if (item.errorCode != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    item.regularizationSuggested
                        ? '${item.errorCode} · regularization available'
                        : item.errorCode!,
                    style: const TextStyle(color: AppTheme.slate, fontSize: 11),
                  ),
                ],
              ],
            ),
          ),
          if (onRetry != null)
            IconButton(
              tooltip: 'Retry safely',
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
            ),
        ],
      ),
    );
  }
}

String _label(String type) => switch (type) {
  'CHECKIN' => 'Check in',
  'CHECKOUT' => 'Check out',
  'BREAK_START' => 'Break start',
  'BREAK_END' => 'Break end',
  _ => type,
};

String _statusLabel(SyncQueueItem item) => switch (item.status) {
  'SYNCED' => 'Synced',
  'REJECTED' => 'Needs attention',
  'RETRYABLE' => 'Retry scheduled · attempt ${item.attempts}',
  _ => 'Saved offline',
};

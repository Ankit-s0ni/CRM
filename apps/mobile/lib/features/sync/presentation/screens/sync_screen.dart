import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../widgets/sync_queue_tile.dart';
import '../../../../l10n/l10n_context.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  bool _syncing = false;
  bool _synced = false;

  Future<void> _sync() async {
    if (_syncing) return;
    setState(() => _syncing = true);
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;
    setState(() {
      _syncing = false;
      _synced = true;
    });
    AppFeedback.success(context, 'Attendance records are up to date.');
  }

  @override
  Widget build(BuildContext context) => AppPage(
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
                  color: (_synced ? AppTheme.green : AppTheme.warmText)
                      .withValues(alpha: .1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _synced ? Icons.cloud_done_rounded : Icons.cloud_off_outlined,
                  color: _synced ? AppTheme.green : AppTheme.warmText,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _synced
                          ? context.l10n.everythingSynced
                          : '3 records waiting',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _synced
                          ? 'Last synced just now'
                          : 'Saved securely on this device',
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
        if (!_synced) ...[
          const SizedBox(height: 12),
          const SyncQueueTile(label: 'Check-in · 9:12 AM'),
          const SizedBox(height: 12),
          const SyncQueueTile(label: 'Break start · 1:00 PM'),
          const SizedBox(height: 18),
          PrimaryButton(
            label: _syncing ? 'Syncing securely…' : context.l10n.syncNow,
            icon: _syncing ? null : Icons.sync_rounded,
            onPressed: _syncing ? null : _sync,
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

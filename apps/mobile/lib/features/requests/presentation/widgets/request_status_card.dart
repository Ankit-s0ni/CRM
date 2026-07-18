import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';

class RequestStatusCard extends StatelessWidget {
  const RequestStatusCard({
    super.key,
    required this.title,
    required this.status,
    required this.detail,
    this.requestId = 'REG-2026-0042',
    this.submitted = 'Submitted 1 day ago',
    this.onCancel,
  });
  final String title;
  final String status;
  final String detail;
  final String requestId;
  final String submitted;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final statusColor = switch (status) {
      'Approved' => AppTheme.green,
      'Rejected' => AppTheme.danger,
      _ => const Color(0xFFD97706),
    };
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: .1),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(
                  Icons.edit_calendar_outlined,
                  size: 19,
                  color: statusColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              StatusChip(label: status, color: statusColor),
            ],
          ),
          const SizedBox(height: 14),
          Text(detail, style: const TextStyle(color: AppTheme.slate)),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Text(
                  requestId,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  submitted,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                  style: const TextStyle(color: AppTheme.slate, fontSize: 10),
                ),
              ),
            ],
          ),
          if (onCancel != null) ...[
            const SizedBox(height: 10),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton.icon(
                onPressed: onCancel,
                icon: const Icon(Icons.close_rounded),
                label: const Text('Cancel request'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

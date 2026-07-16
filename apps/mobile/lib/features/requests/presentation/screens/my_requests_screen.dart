import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../widgets/request_status_card.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});
  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  String? _filter;

  @override
  Widget build(BuildContext context) {
    final requests = [
      (
        title: '5 Jul · ${context.l10n.missingCheckout}',
        status: context.l10n.pending,
        detail: 'Waiting for Mariam Al Balushi · 1 day',
        id: 'REG-2026-0042',
        submitted: 'Submitted 5 Jul',
      ),
      (
        title: '28 Jun · ${context.l10n.deviceIssue}',
        status: context.l10n.approved,
        detail: 'Approved by Ahmed Al Lawati',
        id: 'REG-2026-0038',
        submitted: 'Resolved 29 Jun',
      ),
      (
        title: '12 Jun · ${context.l10n.shiftCorrection}',
        status: context.l10n.rejected,
        detail: 'Outside the 7-day correction window',
        id: 'REG-2026-0021',
        submitted: 'Resolved 13 Jun',
      ),
    ];
    final selectedFilter = _filter ?? context.l10n.all;
    final visible = selectedFilter == context.l10n.all
        ? requests
        : requests
              .where((request) => request.status == selectedFilter)
              .toList();
    return AppPage(
      title: context.l10n.myRequests,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, color: AppTheme.slate),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.l10n.requestsSevenDays,
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final filter in [
                  context.l10n.all,
                  context.l10n.pending,
                  context.l10n.approved,
                  context.l10n.rejected,
                ])
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 8),
                    child: ChoiceChip(
                      label: Text(filter),
                      selected: selectedFilter == filter,
                      onSelected: (_) => setState(() => _filter = filter),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            context.l10n.requestsCount(visible.length),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 10),
          for (final request in visible) ...[
            RequestStatusCard(
              title: request.title,
              status: request.status,
              detail: request.detail,
              requestId: request.id,
              submitted: request.submitted,
            ),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

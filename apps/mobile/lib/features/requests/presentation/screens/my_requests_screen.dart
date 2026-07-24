import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/tenant/tenant_config.dart';
import '../../../../core/tenant/tenant_controller.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../../../leave/data/leave_api_repository.dart';
import '../../data/requests_api_repository.dart';
import '../widgets/request_status_card.dart';

class MyRequestsScreen extends ConsumerStatefulWidget {
  const MyRequestsScreen({super.key, required this.onApplyLeave});

  final VoidCallback onApplyLeave;

  @override
  ConsumerState<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends ConsumerState<MyRequestsScreen> {
  String _filter = 'ALL';
  late Future<List<_RequestView>> _requests;

  @override
  void initState() {
    super.initState();
    _requests = _load();
  }

  Future<List<_RequestView>> _load() async {
    final runtime = ref.read(tenantControllerProvider);
    final futures = <Future<List<_RequestView>>>[];
    if (runtime.hasModule(TenantModule.regularization)) {
      futures.add(
        ref
            .read(requestsRepositoryProvider)
            .mine()
            .then(
              (items) => items.map(_regularization).toList(growable: false),
            ),
      );
    }
    if (runtime.hasModule(TenantModule.leave)) {
      futures.add(
        ref
            .read(leaveRepositoryProvider)
            .requests()
            .then((items) => items.map(_leave).toList(growable: false)),
      );
    }
    final groups = await Future.wait(futures.map(_loadSource));
    if (groups.isNotEmpty && groups.every((group) => group.failed)) {
      throw StateError('Every enabled request source failed');
    }
    return groups.expand((group) => group.items).toList(growable: false)
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<_RequestGroup> _loadSource(Future<List<_RequestView>> source) async {
    try {
      return _RequestGroup(await source, false);
    } catch (_) {
      return const _RequestGroup(<_RequestView>[], true);
    }
  }

  void _reload() => setState(() => _requests = _load());

  Future<void> _cancel(_RequestView request) async {
    final confirmed = await AppFeedback.confirm(
      context: context,
      title: 'Cancel request?',
      message: 'This pending request will be withdrawn.',
      confirmLabel: 'Cancel request',
    );
    if (!confirmed || !mounted) return;
    try {
      if (request.type == 'LEAVE') {
        await ref.read(leaveRepositoryProvider).cancel(request.id);
      } else {
        await ref.read(requestsRepositoryProvider).cancel(request.id);
      }
      if (!mounted) return;
      AppFeedback.success(context, 'The request was cancelled.');
      _reload();
    } catch (_) {
      if (mounted) {
        AppFeedback.error(context, 'The request could not be cancelled.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final runtime = ref.watch(tenantControllerProvider);
    final leaveEnabled = runtime.hasModule(TenantModule.leave);
    return AppPage(
      title: context.l10n.myRequests,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (leaveEnabled) ...[
            PrimaryButton(
              label: 'Apply for leave',
              icon: Icons.add_rounded,
              onPressed: widget.onApplyLeave,
            ),
            const SizedBox(height: 14),
          ],
          AppCard(
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, color: AppTheme.slate),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Track leave and attendance correction requests in one place.',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
                IconButton(
                  tooltip: 'Refresh requests',
                  onPressed: _reload,
                  icon: const Icon(Icons.refresh_rounded),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final filter in const [
                  ('ALL', 'All'),
                  ('PENDING', 'Pending'),
                  ('APPROVED', 'Approved'),
                  ('REJECTED', 'Rejected'),
                  ('CANCELLED', 'Cancelled'),
                ])
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 8),
                    child: ChoiceChip(
                      label: Text(filter.$2),
                      selected: _filter == filter.$1,
                      onSelected: (_) => setState(() => _filter = filter.$1),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FutureBuilder<List<_RequestView>>(
            future: _requests,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _ErrorState(onRetry: _reload);
              }
              final items = (snapshot.data ?? const <_RequestView>[])
                  .where((item) => _filter == 'ALL' || item.status == _filter)
                  .toList(growable: false);
              if (items.isEmpty) {
                return const EmptyState(
                  title: 'No requests match this filter.',
                  icon: Icons.inbox_outlined,
                );
              }
              return Column(
                children: [
                  for (final request in items) ...[
                    RequestStatusCard(
                      title: request.title,
                      status: _titleCase(request.status),
                      detail: request.detail,
                      requestId:
                          '${request.type} · ${request.id.substring(0, request.id.length.clamp(0, 8))}',
                      submitted: DateFormat.yMMMd().format(request.createdAt),
                      onCancel: request.status == 'PENDING'
                          ? () => _cancel(request)
                          : null,
                    ),
                    const SizedBox(height: 12),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      children: [
        const Text('Requests could not be loaded.'),
        TextButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('Try again'),
        ),
      ],
    ),
  );
}

_RequestView _regularization(Map<String, dynamic> item) {
  final log = item['attendanceLog'] as Map<String, dynamic>? ?? const {};
  final date = '${log['attendanceDate'] ?? 'Attendance day'}';
  return _RequestView(
    id: '${item['id']}',
    type: 'CORRECTION',
    title: '$date · Attendance correction',
    status: '${item['status'] ?? 'PENDING'}',
    detail: '${item['reason'] ?? 'No reason supplied'}',
    createdAt: DateTime.tryParse('${item['createdAt']}') ?? DateTime(1970),
  );
}

_RequestView _leave(Map<String, dynamic> item) {
  final policy = item['policy'] as Map<String, dynamic>? ?? const {};
  final startDate = DateTime.tryParse('${item['startDate']}');
  final endDate = DateTime.tryParse('${item['endDate']}');
  return _RequestView(
    id: '${item['id']}',
    type: 'LEAVE',
    title: '${policy['name'] ?? 'Leave'} · ${_dateRange(startDate, endDate)}',
    status: '${item['status'] ?? 'PENDING'}',
    detail: '${item['totalDays'] ?? 0} day(s) · ${item['reason'] ?? ''}',
    createdAt: DateTime.tryParse('${item['createdAt']}') ?? DateTime(1970),
  );
}

String _dateRange(DateTime? start, DateTime? end) {
  if (start == null || end == null) return 'Dates unavailable';
  // Leave dates are date-only values. Keep their calendar date instead of
  // applying the device timezone, which can move UTC midnight to another day.
  if (DateUtils.isSameDay(start, end)) {
    return DateFormat.yMMMd().format(start);
  }
  if (start.year == end.year && start.month == end.month) {
    return '${DateFormat.MMMd().format(start)}–${end.day}, ${end.year}';
  }
  return '${DateFormat.yMMMd().format(start)}–${DateFormat.yMMMd().format(end)}';
}

String _titleCase(String value) =>
    value.isEmpty ? value : '${value[0]}${value.substring(1).toLowerCase()}';

class _RequestView {
  const _RequestView({
    required this.id,
    required this.type,
    required this.title,
    required this.status,
    required this.detail,
    required this.createdAt,
  });
  final String id;
  final String type;
  final String title;
  final String status;
  final String detail;
  final DateTime createdAt;
}

class _RequestGroup {
  const _RequestGroup(this.items, this.failed);

  final List<_RequestView> items;
  final bool failed;
}

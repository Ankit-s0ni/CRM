import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../data/leave_api_repository.dart';

class LeaveApplyScreen extends ConsumerStatefulWidget {
  const LeaveApplyScreen({super.key, required this.onSubmitted});

  final VoidCallback onSubmitted;

  @override
  ConsumerState<LeaveApplyScreen> createState() => _LeaveApplyScreenState();
}

class _LeaveApplyScreenState extends ConsumerState<LeaveApplyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reason = TextEditingController();
  late Future<_LeaveOptions> _options;
  DateTimeRange? _range;
  String? _policyId;
  bool _halfDay = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _options = _load();
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<_LeaveOptions> _load() async {
    final repository = ref.read(leaveRepositoryProvider);
    final values = await Future.wait([
      repository.policies(),
      repository.balances(),
    ]);
    return _LeaveOptions(policies: values[0], balances: values[1]);
  }

  Future<void> _pickDates() async {
    final now = DateTime.now();
    final selected = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 1, 12, 31),
      initialDateRange: _range,
    );
    if (selected != null && mounted) {
      setState(() {
        _range = selected;
        if (selected.start != selected.end) _halfDay = false;
      });
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_policyId == null || _range == null) {
      AppFeedback.error(context, 'Choose a leave type and date range.');
      return;
    }
    final confirmed = await AppFeedback.confirm(
      context: context,
      title: 'Submit leave request?',
      message:
          'Your available balance will be reserved while this request is pending.',
      confirmLabel: 'Submit request',
    );
    if (!confirmed || !mounted) return;
    setState(() => _submitting = true);
    try {
      final day = DateFormat('yyyy-MM-dd');
      await ref.read(leaveRepositoryProvider).createRequest({
        'policyId': _policyId,
        'startDate': day.format(_range!.start),
        'endDate': day.format(_range!.end),
        'halfDayStart': _halfDay,
        'halfDayEnd': false,
        'reason': _reason.text.trim(),
      });
      if (!mounted) return;
      AppFeedback.success(context, 'Your leave request was submitted.');
      widget.onSubmitted();
    } catch (_) {
      if (mounted) {
        AppFeedback.error(
          context,
          'Leave could not be submitted. Check your balance and selected dates.',
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => AppPage(
    title: 'Apply for leave',
    back: true,
    child: FutureBuilder<_LeaveOptions>(
      future: _options,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return AppCard(
            child: Column(
              children: [
                const Text('Leave balances could not be loaded.'),
                TextButton(
                  onPressed: () => setState(() => _options = _load()),
                  child: const Text('Try again'),
                ),
              ],
            ),
          );
        }
        final options = snapshot.data!;
        return Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (options.balances.isNotEmpty) ...[
                Text(
                  'Available balance',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 108,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: options.balances.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 10),
                    itemBuilder: (context, index) {
                      final balance = options.balances[index];
                      final policy =
                          balance['policy'] as Map<String, dynamic>? ??
                          const {};
                      return SizedBox(
                        width: 160,
                        child: AppCard(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${policy['name'] ?? 'Leave'}', maxLines: 1),
                              const Spacer(),
                              Text(
                                '${balance['remainingDays'] ?? 0} days',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 18),
              ],
              DropdownButtonFormField<String>(
                initialValue: _policyId,
                decoration: const InputDecoration(labelText: 'Leave type'),
                items: options.policies
                    .where((policy) => policy['isActive'] != false)
                    .map(
                      (policy) => DropdownMenuItem(
                        value: '${policy['id']}',
                        child: Text('${policy['name'] ?? policy['leaveType']}'),
                      ),
                    )
                    .toList(growable: false),
                onChanged: _submitting
                    ? null
                    : (value) => setState(() => _policyId = value),
                validator: (value) =>
                    value == null ? 'Choose a leave type' : null,
              ),
              const SizedBox(height: 14),
              InkWell(
                onTap: _submitting ? null : _pickDates,
                borderRadius: BorderRadius.circular(12),
                child: InputDecorator(
                  decoration: const InputDecoration(labelText: 'Leave dates'),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.date_range_outlined,
                        color: AppTheme.slate,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _range == null
                              ? 'Select start and end dates'
                              : '${DateFormat.yMMMd().format(_range!.start)} – ${DateFormat.yMMMd().format(_range!.end)}',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (_range?.start == _range?.end) ...[
                const SizedBox(height: 10),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  value: _halfDay,
                  onChanged: _submitting
                      ? null
                      : (value) => setState(() => _halfDay = value),
                  title: const Text('Half day'),
                  subtitle: const Text(
                    'Reserve half of the selected working day.',
                  ),
                ),
              ],
              const SizedBox(height: 14),
              TextFormField(
                controller: _reason,
                maxLines: 4,
                maxLength: 1000,
                enabled: !_submitting,
                decoration: const InputDecoration(
                  labelText: 'Reason',
                  alignLabelWithHint: true,
                ),
                validator: (value) => (value?.trim().length ?? 0) < 3
                    ? 'Add a short reason for your leave.'
                    : null,
              ),
              const SizedBox(height: 12),
              PrimaryButton(
                label: _submitting ? 'Submitting…' : 'Submit leave request',
                icon: _submitting ? null : Icons.send_rounded,
                onPressed: _submitting ? null : _submit,
              ),
            ],
          ),
        );
      },
    ),
  );
}

class _LeaveOptions {
  const _LeaveOptions({required this.policies, required this.balances});
  final List<Map<String, dynamic>> policies;
  final List<Map<String, dynamic>> balances;
}

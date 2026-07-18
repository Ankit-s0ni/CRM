import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../widgets/problem_day_card.dart';
import '../../../../l10n/l10n_context.dart';
import '../../data/requests_api_repository.dart';

class RegularizationScreen extends ConsumerStatefulWidget {
  const RegularizationScreen({
    super.key,
    required this.onSubmit,
    this.attendanceLogId,
    this.attendanceDate,
  });
  final VoidCallback onSubmit;
  final String? attendanceLogId;
  final String? attendanceDate;

  @override
  ConsumerState<RegularizationScreen> createState() =>
      _RegularizationScreenState();
}

class _RegularizationScreenState extends ConsumerState<RegularizationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reason = TextEditingController();
  TimeOfDay? _requestedTime;
  bool _submitting = false;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final value = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 18, minute: 0),
      helpText: context.l10n.requestedCheckout.toUpperCase(),
    );
    if (value != null && mounted) setState(() => _requestedTime = value);
  }

  Future<void> _submit() async {
    if (_requestedTime == null) {
      AppFeedback.error(context, context.l10n.selectCheckoutTime);
      return;
    }
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final confirmed = await AppFeedback.confirm(
      context: context,
      title: context.l10n.submitRequest,
      message: context.l10n.submitRequestWarning,
      confirmLabel: context.l10n.sendManager,
    );
    if (!confirmed || !mounted) return;
    setState(() => _submitting = true);
    try {
      final attendanceLogId = widget.attendanceLogId;
      final attendanceDate = DateTime.tryParse(widget.attendanceDate ?? '');
      if (attendanceLogId == null || attendanceDate == null) {
        AppFeedback.error(
          context,
          'Open a day from Attendance history before requesting a correction.',
        );
        return;
      }
      final requested = DateTime(
        attendanceDate.year,
        attendanceDate.month,
        attendanceDate.day,
        _requestedTime!.hour,
        _requestedTime!.minute,
      );
      await ref.read(requestsRepositoryProvider).createRegularization({
        'attendanceLogId': attendanceLogId,
        'requestedCheckout': requested.toUtc().toIso8601String(),
        'reason': _reason.text.trim(),
        'idempotencyKey': _uuid(),
      });
      if (!mounted) return;
      AppFeedback.success(context, context.l10n.requestSent);
      widget.onSubmit();
    } catch (_) {
      if (mounted) {
        AppFeedback.error(
          context,
          'The correction could not be submitted. Check the date and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => AppPage(
    title: context.l10n.regularizationRequest,
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ProblemDayCard(date: widget.attendanceDate),
          const SizedBox(height: 18),
          Text(
            context.l10n.correctionDetails,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 10),
          Text(
            context.l10n.requestedCheckout,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 6),
          Semantics(
            button: true,
            label: context.l10n.requestedCheckout,
            value: _requestedTime?.format(context) ?? context.l10n.selectTime,
            child: InkWell(
              onTap: _submitting ? null : _pickTime,
              borderRadius: BorderRadius.circular(12),
              child: Ink(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFCBC8D8)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _requestedTime?.format(context) ??
                            context.l10n.selectTime,
                        style: TextStyle(
                          color: _requestedTime == null
                              ? AppTheme.slate
                              : AppTheme.charcoal,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _reason,
            enabled: !_submitting,
            maxLines: 4,
            maxLength: 300,
            textCapitalization: TextCapitalization.sentences,
            validator: (value) {
              final reason = value?.trim() ?? '';
              if (reason.isEmpty) {
                return context.l10n.reasonRequired;
              }
              if (reason.length < 10) {
                return context.l10n.reasonMoreDetail;
              }
              return null;
            },
            decoration: InputDecoration(
              labelText: context.l10n.reason,
              hintText: context.l10n.reasonHint,
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 8),
          PrimaryButton(
            label: _submitting
                ? context.l10n.submitting
                : context.l10n.sendManager,
            icon: _submitting ? null : Icons.send_rounded,
            onPressed: _submitting ? null : _submit,
          ),
        ],
      ),
    ),
  );
}

String _uuid() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final value = bytes
      .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
      .join();
  return '${value.substring(0, 8)}-${value.substring(8, 12)}-'
      '${value.substring(12, 16)}-${value.substring(16, 20)}-'
      '${value.substring(20)}';
}

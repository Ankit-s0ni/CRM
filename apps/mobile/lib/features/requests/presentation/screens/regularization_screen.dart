import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../widgets/problem_day_card.dart';
import '../../../../l10n/l10n_context.dart';

class RegularizationScreen extends StatefulWidget {
  const RegularizationScreen({super.key, required this.onSubmit});
  final VoidCallback onSubmit;

  @override
  State<RegularizationScreen> createState() => _RegularizationScreenState();
}

class _RegularizationScreenState extends State<RegularizationScreen> {
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
    await Future<void>.delayed(const Duration(milliseconds: 450));
    if (!mounted) return;
    AppFeedback.success(context, context.l10n.requestSent);
    widget.onSubmit();
  }

  @override
  Widget build(BuildContext context) => AppPage(
    title: context.l10n.regularizationRequest,
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ProblemDayCard(),
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

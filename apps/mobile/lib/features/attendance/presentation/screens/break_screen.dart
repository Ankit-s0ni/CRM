import 'package:flutter/material.dart';

import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class BreakScreen extends StatefulWidget {
  const BreakScreen({
    super.key,
    required this.onToggle,
    this.isOnBreak = false,
  });
  final VoidCallback onToggle;
  final bool isOnBreak;

  @override
  State<BreakScreen> createState() => _BreakScreenState();
}

class _BreakScreenState extends State<BreakScreen> {
  bool _updating = false;

  Future<void> _toggle() async {
    final confirmed = await AppFeedback.confirm(
      context: context,
      title: widget.isOnBreak
          ? '${context.l10n.endBreak}?'
          : '${context.l10n.startBreak}?',
      message: widget.isOnBreak
          ? 'Working time resumes immediately when your break ends.'
          : 'Break time begins immediately and may be unpaid according to your attendance policy.',
      confirmLabel: widget.isOnBreak
          ? context.l10n.endBreak
          : context.l10n.startBreak,
    );
    if (!confirmed || !mounted) return;
    setState(() => _updating = true);
    widget.onToggle();
  }

  @override
  Widget build(BuildContext context) => AppPage(
    title: widget.isOnBreak
        ? context.l10n.breakInProgress
        : context.l10n.takeBreak,
    child: Column(
      children: [
        const SizedBox(height: 30),
        Container(
          width: 82,
          height: 82,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF5E8),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Icon(
            widget.isOnBreak
                ? Icons.play_arrow_rounded
                : Icons.free_breakfast_outlined,
            size: 40,
            color: const Color(0xFF85551F),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          widget.isOnBreak ? 'Ready to resume?' : 'Ready for a break?',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(
          widget.isOnBreak
              ? 'End your break to resume tracked working time.'
              : 'Your manager can see your break status. Tracking resumes when your break ends.',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        PrimaryButton(
          label: _updating
              ? 'Updating break…'
              : widget.isOnBreak
              ? context.l10n.endBreak
              : context.l10n.startBreak,
          icon: _updating
              ? null
              : widget.isOnBreak
              ? Icons.play_arrow_rounded
              : Icons.coffee_rounded,
          onPressed: _updating ? null : _toggle,
        ),
      ],
    ),
  );
}

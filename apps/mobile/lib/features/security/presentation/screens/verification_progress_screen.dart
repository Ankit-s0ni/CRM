import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../widgets/verification_checklist.dart';
import '../../../../l10n/l10n_context.dart';

class VerificationProgressScreen extends StatefulWidget {
  const VerificationProgressScreen({super.key, required this.onComplete});
  final VoidCallback onComplete;

  @override
  State<VerificationProgressScreen> createState() =>
      _VerificationProgressScreenState();
}

class _VerificationProgressScreenState
    extends State<VerificationProgressScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(milliseconds: 1600), () {
      if (mounted) widget.onComplete();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _warnBeforeLeaving() => AppFeedback.information(
    context: context,
    title: context.l10n.verificationInProgress,
    message: context.l10n.verificationWait,
  );

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: false,
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop) _warnBeforeLeaving();
    },
    child: Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppTheme.charcoal,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: const Icon(
                    Icons.verified_user_outlined,
                    color: Colors.white,
                    size: 34,
                  ),
                ),
                const SizedBox(height: 22),
                Text(
                  context.l10n.verifyingAttendance,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  context.l10n.keepScreenOpen,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppTheme.slate),
                ),
                const SizedBox(height: 24),
                const VerificationChecklist(),
                const SizedBox(height: 24),
                const LinearProgressIndicator(
                  color: AppTheme.charcoal,
                  minHeight: 5,
                  borderRadius: BorderRadius.all(Radius.circular(5)),
                ),
                const SizedBox(height: 12),
                Text(
                  context.l10n.secureVerification,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

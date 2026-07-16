import 'package:flutter/material.dart';

import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../core/tenant/tenant_controller.dart';
import '../../../../l10n/l10n_context.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../widgets/tracking_map_card.dart';
import '../widgets/tracking_status_card.dart';

class TrackingScreen extends ConsumerStatefulWidget {
  const TrackingScreen({super.key});

  @override
  ConsumerState<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends ConsumerState<TrackingScreen> {
  bool _active = false;
  bool _updating = false;

  Future<void> _toggle() async {
    final starting = !_active;
    final confirmed = await AppFeedback.confirm(
      context: context,
      title: starting ? 'Start field tracking?' : 'Stop field tracking?',
      message: starting
          ? 'Your work location will be recorded at policy intervals until check-out or until you stop tracking.'
          : 'No further field locations will be recorded after tracking stops.',
      confirmLabel: starting ? 'Start tracking' : 'Stop tracking',
    );
    if (!confirmed || !mounted) return;
    setState(() => _updating = true);
    await Future<void>.delayed(const Duration(milliseconds: 450));
    if (!mounted) return;
    setState(() {
      _active = starting;
      _updating = false;
    });
    AppFeedback.success(
      context,
      starting ? 'Field tracking started.' : 'Field tracking stopped.',
    );
  }

  @override
  Widget build(BuildContext context) => AppPage(
    title: context.l10n.fieldTracking,
    child: Column(
      children: [
        TrackingMapCard(active: _active),
        const SizedBox(height: 14),
        TrackingStatusCard(active: _active),
        const SizedBox(height: 12),
        AppCard(
          child: Row(
            children: [
              const Icon(Icons.policy_outlined),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Policy interval: every ${ref.watch(tenantControllerProvider).attendancePolicy.trackingIntervalMinutes} minutes\nStops automatically at check-out',
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        PrimaryButton(
          label: _updating
              ? 'Updating…'
              : _active
              ? context.l10n.stopTracking
              : context.l10n.startTracking,
          icon: _updating
              ? null
              : _active
              ? Icons.stop_circle_outlined
              : Icons.play_circle_outline_rounded,
          onPressed: _updating ? null : _toggle,
        ),
      ],
    ),
  );
}

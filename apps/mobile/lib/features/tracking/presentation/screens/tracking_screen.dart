import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/tenant/tenant_controller.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../tracking_controller.dart';
import '../widgets/tracking_map_card.dart';
import '../widgets/tracking_status_card.dart';

class TrackingScreen extends ConsumerWidget {
  const TrackingScreen({super.key});

  Future<void> _toggle(
    BuildContext context,
    WidgetRef ref,
    TrackingViewState state,
  ) async {
    final starting = !state.active;
    final confirmed = await AppFeedback.confirm(
      context: context,
      title: starting ? 'Start field tracking?' : 'Stop field tracking?',
      message: starting
          ? 'Your work location will be recorded at policy intervals until check-out or until you stop tracking.'
          : 'No further field locations will be recorded after tracking stops.',
      confirmLabel: starting ? 'Start tracking' : 'Stop tracking',
    );
    if (!confirmed || !context.mounted) return;
    final controller = ref.read(trackingControllerProvider.notifier);
    final success = starting
        ? await controller.start()
        : await controller.stop();
    if (!context.mounted) return;
    if (success) {
      AppFeedback.success(
        context,
        starting ? 'Field tracking started.' : 'Field tracking stopped.',
      );
    } else {
      AppFeedback.error(
        context,
        'Tracking could not be updated. Check location permission and try again.',
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncState = ref.watch(trackingControllerProvider);
    final state = asyncState.valueOrNull ?? const TrackingViewState();
    final interval = ref
        .watch(tenantControllerProvider)
        .attendancePolicy
        .trackingIntervalMinutes;
    return AppPage(
      title: context.l10n.fieldTracking,
      child: Column(
        children: [
          TrackingMapCard(
            active: state.active,
            pingCount: state.pingCount,
            intervalMinutes: interval,
            lastPingAt: state.lastPingAt,
            latitude: state.lastLatitude,
            longitude: state.lastLongitude,
          ),
          const SizedBox(height: 14),
          TrackingStatusCard(
            active: state.active,
            backgroundPermission: state.backgroundPermission,
            batteryLevel: state.batteryLevel,
            startedAt: state.session?.startedAt,
          ),
          if (state.errorCode != null) ...[
            const SizedBox(height: 12),
            AppCard(
              child: Row(
                children: [
                  const Icon(
                    Icons.warning_amber_rounded,
                    color: AppTheme.warmText,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _message(state.errorCode!),
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          AppCard(
            child: Row(
              children: [
                const Icon(Icons.policy_outlined),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Policy interval: every $interval minutes\nBackground jobs adapt when battery is low · stops at check-out',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          if (state.active) ...[
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: state.updating
                  ? null
                  : () => ref
                        .read(trackingControllerProvider.notifier)
                        .captureNow(),
              icon: const Icon(Icons.my_location_rounded),
              label: const Text('Capture location now'),
            ),
          ],
          const SizedBox(height: 18),
          PrimaryButton(
            label: state.updating || asyncState.isLoading
                ? 'Updating…'
                : state.active
                ? context.l10n.stopTracking
                : context.l10n.startTracking,
            icon: state.updating || asyncState.isLoading
                ? null
                : state.active
                ? Icons.stop_circle_outlined
                : Icons.play_circle_outline_rounded,
            onPressed: state.updating || asyncState.isLoading
                ? null
                : () => _toggle(context, ref, state),
          ),
        ],
      ),
    );
  }
}

String _message(String code) => switch (code) {
  'LOCATION_DISABLED' =>
    'Turn on location services before starting field work.',
  'LOCATION_PERMISSION_DENIED' =>
    'Location permission is required for field tracking.',
  'BACKGROUND_LOCATION_REQUIRED' =>
    'Allow background location so scheduled captures continue when the app is minimized.',
  'FIELD_TRACKING_NOT_ALLOWED' =>
    'Field tracking is not enabled for this employee or device.',
  _ =>
    'The secure tracking service is temporarily unavailable. Queued captures remain safe.',
};

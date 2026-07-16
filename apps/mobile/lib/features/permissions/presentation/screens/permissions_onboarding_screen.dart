import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../domain/app_capability.dart';
import '../permissions_controller.dart';
import '../widgets/capability_permission_card.dart';
import '../../../../l10n/l10n_context.dart';

class PermissionsOnboardingScreen extends ConsumerStatefulWidget {
  const PermissionsOnboardingScreen({super.key, required this.onContinue});
  final VoidCallback onContinue;

  @override
  ConsumerState<PermissionsOnboardingScreen> createState() =>
      _PermissionsOnboardingScreenState();
}

class _PermissionsOnboardingScreenState
    extends ConsumerState<PermissionsOnboardingScreen>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(permissionsControllerProvider.notifier).refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(permissionsControllerProvider);
    final snapshot = state.value;
    return AppPage(
      title: context.l10n.attendancePermissions,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.l10n.permissionsIntro,
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 18),
          if (snapshot?.isWeb ?? false)
            AppCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.language),
                title: Text(context.l10n.browserPermissionMode),
                subtitle: const Text(
                  'Camera, location and notifications require HTTPS and are requested by your browser. Background field tracking is unavailable on web.',
                ),
              ),
            ),
          if (snapshot?.isWeb ?? false) const SizedBox(height: 12),
          for (final capability in AppCapability.values)
            if (snapshot?.permission(capability).status !=
                CapabilityStatus.unavailable) ...[
              CapabilityPermissionCard(
                capability: capability,
                status:
                    snapshot?.permission(capability).status ??
                    CapabilityStatus.denied,
                onRequest: state.isLoading
                    ? null
                    : () => ref
                          .read(permissionsControllerProvider.notifier)
                          .request(capability),
              ),
              const SizedBox(height: 12),
            ],
          if (state.hasError)
            const Text(
              'Permission status could not be loaded. You can retry or continue in degraded mode.',
              style: TextStyle(color: Colors.redAccent),
            ),
          const SizedBox(height: 8),
          PrimaryButton(
            label: context.l10n.continueAction,
            onPressed: widget.onContinue,
          ),
        ],
      ),
    );
  }
}

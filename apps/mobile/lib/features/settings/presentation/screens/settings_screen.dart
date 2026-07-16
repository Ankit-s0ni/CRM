import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/tenant/tenant_controller.dart';
import '../../../../l10n/l10n_context.dart';
import '../../../permissions/domain/app_capability.dart';
import '../../../permissions/presentation/permissions_controller.dart';
import '../../../permissions/presentation/widgets/capability_permission_card.dart';
import '../widgets/preference_switches.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _unregistered = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(permissionsControllerProvider);
    final snapshot = state.value;
    return AppPage(
      title: context.l10n.settingsPermissions,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.l10n.permissions,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
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
              const SizedBox(height: 10),
            ],
          const SizedBox(height: 4),
          Text(
            context.l10n.preferences,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          const PreferenceSwitches(),
          const SizedBox(height: 18),
          Text(
            context.l10n.language,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'en', label: Text(context.l10n.english)),
              ButtonSegment(value: 'ar', label: Text(context.l10n.arabic)),
            ],
            selected: {ref.watch(tenantControllerProvider).locale.languageCode},
            onSelectionChanged: (selection) => ref
                .read(tenantControllerProvider.notifier)
                .setLocale(Locale(selection.first)),
          ),
          const SizedBox(height: 18),
          Text(
            'Version 1.0.0 · ${context.l10n.privacyPolicy} · ${context.l10n.licenses}',
          ),
          TextButton(
            onPressed: _unregistered ? null : _confirmUnregister,
            child: Text(
              _unregistered
                  ? context.l10n.deviceUnregistered
                  : context.l10n.unregisterDevice,
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmUnregister() async {
    final confirmed = await AppFeedback.confirm(
      context: context,
      title: context.l10n.unregisterConfirm,
      message: context.l10n.unregisterWarning,
      confirmLabel: context.l10n.unregisterAction,
    );
    if (!confirmed || !mounted) return;
    setState(() => _unregistered = true);
    AppFeedback.success(context, context.l10n.deviceUnregistered);
  }
}

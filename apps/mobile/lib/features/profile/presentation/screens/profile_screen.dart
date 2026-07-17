import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/tenant/tenant_controller.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../widgets/profile_details_card.dart';
import '../widgets/profile_header.dart';
import '../profile_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key, required this.onSettings});
  final VoidCallback onSettings;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileControllerProvider);
    final data = profile.asData?.value ?? const <String, dynamic>{};
    final department = data['department'] as Map<String, dynamic>?;
    final designation = data['designation'] as Map<String, dynamic>?;
    final manager = data['manager'] as Map<String, dynamic>?;
    final assignments = data['officeAssignments'] as List<dynamic>?;
    final officeAssignment = assignments
        ?.whereType<Map<String, dynamic>>()
        .firstOrNull;
    final office = officeAssignment?['office'] as Map<String, dynamic>?;
    return AppPage(
      title: context.l10n.profile,
      child: Column(
        children: [
          ProfileHeader(
            name: data['fullName'] as String? ?? 'Employee',
            employeeCode: data['employeeCode'] as String? ?? '—',
            designation: designation?['name'] as String? ?? 'Not assigned',
            department: department?['name'] as String? ?? 'Not assigned',
          ),
          const SizedBox(height: 20),
          ProfileDetailsCard(
            tenant: ref.watch(tenantControllerProvider),
            employeeCode: data['employeeCode'] as String? ?? '—',
            department: department?['name'] as String? ?? 'Not assigned',
            manager: manager?['fullName'] as String? ?? 'Not assigned',
            office: office?['officeName'] as String? ?? 'Not assigned',
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: context.l10n.settingsPermissions,
            onPressed: onSettings,
          ),
          if (profile.isLoading) const LinearProgressIndicator(),
          if (profile.hasError) const Text('Profile could not be loaded.'),
        ],
      ),
    );
  }
}

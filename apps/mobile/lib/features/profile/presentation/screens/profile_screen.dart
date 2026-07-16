import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/tenant/tenant_controller.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../widgets/profile_details_card.dart';
import '../widgets/profile_header.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key, required this.onSettings});
  final VoidCallback onSettings;
  @override
  Widget build(BuildContext context, WidgetRef ref) => AppPage(
    title: context.l10n.profile,
    child: Column(
      children: [
        const ProfileHeader(
          name: 'Salim Al Harthy',
          employeeCode: 'NSL-1042',
          designation: 'Field Operations Coordinator',
          department: 'Field Operations',
        ),
        const SizedBox(height: 20),
        ProfileDetailsCard(tenant: ref.watch(tenantControllerProvider)),
        const SizedBox(height: 16),
        PrimaryButton(
          label: context.l10n.settingsPermissions,
          onPressed: onSettings,
        ),
      ],
    ),
  );
}

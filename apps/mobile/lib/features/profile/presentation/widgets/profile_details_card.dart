import 'package:flutter/material.dart';

import '../../../../core/tenant/tenant_config.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class ProfileDetailsCard extends StatelessWidget {
  const ProfileDetailsCard({super.key, required this.tenant});
  final TenantConfig tenant;

  @override
  Widget build(BuildContext context) => AppCard(
    padding: EdgeInsets.zero,
    child: Column(
      children: [
        _Detail(
          icon: Icons.badge_outlined,
          label: context.l10n.companyCode,
          value: 'NSL-1042',
        ),
        _Detail(
          icon: Icons.account_tree_outlined,
          label: context.l10n.department,
          value: 'Field Operations',
        ),
        _Detail(
          icon: Icons.supervisor_account_outlined,
          label: context.l10n.manager,
          value: 'Mariam Al Balushi',
        ),
        _Detail(
          icon: Icons.apartment_outlined,
          label: context.l10n.office,
          value: 'Muscat Logistics Hub',
        ),
        _Detail(
          icon: Icons.schedule_outlined,
          label: context.l10n.workPolicy,
          value: tenant.attendancePolicy.name,
        ),
        _Detail(
          icon: Icons.public_rounded,
          label: context.l10n.timezone,
          value: tenant.timezone,
          last: true,
        ),
      ],
    ),
  );
}

class _Detail extends StatelessWidget {
  const _Detail({
    required this.icon,
    required this.label,
    required this.value,
    this.last = false,
  });
  final IconData icon;
  final String label;
  final String value;
  final bool last;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      ListTile(leading: Icon(icon), title: Text(label), subtitle: Text(value)),
      if (!last) const Divider(indent: 56),
    ],
  );
}

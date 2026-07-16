import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/tenant/tenant_controller.dart';

class CompanyMark extends ConsumerWidget {
  const CompanyMark({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand = ref.watch(tenantControllerProvider).branding;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: brand.primaryColor,
            borderRadius: BorderRadius.circular(13),
          ),
          child: const Icon(
            Icons.workspaces_outline,
            color: Colors.white,
            size: 22,
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                brand.companyName.toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
              Text(
                brand.productName.toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppTheme.slate,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  letterSpacing: .75,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/tenant/tenant_controller.dart';

class CompanyMark extends ConsumerWidget {
  const CompanyMark({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand = ref.watch(tenantControllerProvider).branding;
    final fallbackLogo = Image.asset(
      'assets/branding/deltcrm-logo.png',
      fit: BoxFit.contain,
    );

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(13),
          child: Container(
            width: 44,
            height: 44,
            padding: const EdgeInsets.all(3),
            color: Colors.white,
            child: brand.logoUrl == null
                ? fallbackLogo
                : Image.network(
                    brand.logoUrl!,
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => fallbackLogo,
                  ),
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

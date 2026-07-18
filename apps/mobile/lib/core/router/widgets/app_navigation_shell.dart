import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/l10n_context.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_feedback.dart';
import '../app_routes.dart';
import '../../tenant/tenant_controller.dart';
import '../../tenant/tenant_config.dart';

class AppNavigationShell extends ConsumerWidget {
  const AppNavigationShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  Future<void> _handleBack(BuildContext context) async {
    if (navigationShell.currentIndex != 0) {
      context.go(AppRoutes.home);
      return;
    }

    final shouldExit = await AppFeedback.confirm(
      context: context,
      title: context.l10n.leaveApp,
      message: context.l10n.remainSignedIn,
      confirmLabel: context.l10n.exit,
      cancelLabel: context.l10n.stay,
    );
    if (!shouldExit || !context.mounted) return;

    if (kIsWeb || defaultTargetPlatform == TargetPlatform.iOS) {
      AppFeedback.success(context, context.l10n.safeToClose);
    } else {
      await SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantControllerProvider);
    final showRequests =
        tenant.hasModule(TenantModule.regularization) ||
        tenant.hasModule(TenantModule.leave);
    final branchIndexes = <int>[0, 1, if (showRequests) 2, 3];
    final selectedIndex = branchIndexes.indexOf(navigationShell.currentIndex);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleBack(context);
      },
      child: Scaffold(
        extendBody: false,
        body: navigationShell,
        bottomNavigationBar: SafeArea(
          minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppTheme.line),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1F101418),
                  blurRadius: 24,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(23),
              child: NavigationBar(
                height: 70,
                elevation: 0,
                backgroundColor: Colors.white,
                indicatorColor: AppTheme.charcoal,
                selectedIndex: selectedIndex < 0 ? 0 : selectedIndex,
                onDestinationSelected: (index) {
                  final branchIndex = branchIndexes[index];
                  if (branchIndex == navigationShell.currentIndex) return;
                  navigationShell.goBranch(branchIndex);
                },
                destinations: [
                  NavigationDestination(
                    icon: const Icon(Icons.home_outlined),
                    selectedIcon: const Icon(
                      Icons.home_rounded,
                      color: Colors.white,
                    ),
                    label: context.l10n.today,
                  ),
                  NavigationDestination(
                    icon: const Icon(Icons.calendar_today_outlined),
                    selectedIcon: const Icon(
                      Icons.calendar_month_rounded,
                      color: Colors.white,
                    ),
                    label: context.l10n.attendance,
                  ),
                  if (showRequests)
                    NavigationDestination(
                      icon: const Icon(Icons.inbox_outlined),
                      selectedIcon: const Icon(
                        Icons.inbox_rounded,
                        color: Colors.white,
                      ),
                      label: context.l10n.requests,
                    ),
                  NavigationDestination(
                    icon: const Icon(Icons.person_outline_rounded),
                    selectedIcon: const Icon(
                      Icons.person_rounded,
                      color: Colors.white,
                    ),
                    label: context.l10n.profile,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

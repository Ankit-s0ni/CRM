import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../l10n/l10n_context.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_feedback.dart';
import '../app_routes.dart';

class AppNavigationShell extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final selectedIndex = navigationShell.currentIndex;
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
                selectedIndex: selectedIndex,
                onDestinationSelected: (index) {
                  if (index == selectedIndex) return;
                  navigationShell.goBranch(index);
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

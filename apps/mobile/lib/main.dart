import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/background/mobile_background_tasks.dart';
import 'core/config/app_config.dart';
import 'core/logging/app_logger.dart';
import 'core/network/network_providers.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/tenant/tenant_controller.dart';
import 'core/widgets/app_availability_gate.dart';
import 'l10n/app_localizations.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('ar');
  await MobileBackgroundTasks.initialize();
  AppLogger.info('mobile_app_started');
  runApp(const ProviderScope(child: HrmsApp()));
}

class HrmsApp extends ConsumerStatefulWidget {
  const HrmsApp({super.key});

  @override
  ConsumerState<HrmsApp> createState() => _HrmsAppState();
}

class _HrmsAppState extends ConsumerState<HrmsApp> with WidgetsBindingObserver {
  StreamSubscription<void>? _sessionRefreshSubscription;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _sessionRefreshSubscription = ref
        .read(apiServiceProvider)
        .sessionRefreshed
        .listen((_) => _refreshRuntime());
  }

  @override
  void dispose() {
    _sessionRefreshSubscription?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed ||
        !ref.read(tenantControllerProvider).runtimeLoaded ||
        AppConfig.localMode) {
      return;
    }
    _refreshRuntime();
  }

  void _refreshRuntime() {
    if (!ref.read(tenantControllerProvider).runtimeLoaded ||
        AppConfig.localMode) {
      return;
    }
    ref
        .read(tenantControllerProvider.notifier)
        .refreshRuntime()
        .catchError((Object _) {});
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final tenant = ref.watch(tenantControllerProvider);
    return ScreenUtilInit(
      designSize: const Size(390, 844),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (_, child) => MaterialApp.router(
        onGenerateTitle: (context) => tenant.branding.productName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(primary: tenant.branding.primaryColor),
        locale: tenant.locale,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        routerConfig: router,
        builder: (context, child) =>
            AppAvailabilityGate(child: child ?? const SizedBox.shrink()),
      ),
    );
  }
}

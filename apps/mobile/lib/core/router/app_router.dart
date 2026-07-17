import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/app_config.dart';
import '../widgets/app_feedback.dart';
import '../../features/attendance/presentation/attendance_controller.dart';
import '../../features/attendance/domain/attendance_models.dart';
import '../../features/attendance/presentation/screens/break_screen.dart';
import '../../features/attendance/presentation/screens/day_detail_screen.dart';
import '../../features/attendance/presentation/screens/history_screen.dart';
import '../../features/attendance/presentation/screens/punch_camera_screen.dart';
import '../../features/attendance/presentation/screens/punch_success_screen.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/consent/presentation/consent_controller.dart';
import '../../features/consent/presentation/screens/consent_screen.dart';
import '../../features/device/presentation/device_controller.dart';
import '../../features/device/presentation/screens/device_registration_screen.dart';
import '../../features/enrollment/presentation/enrollment_controller.dart';
import '../../features/enrollment/presentation/screens/enrollment_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/permissions/presentation/screens/permissions_onboarding_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/requests/presentation/screens/my_requests_screen.dart';
import '../../features/requests/presentation/screens/regularization_screen.dart';
import '../../features/security/presentation/screens/punch_failure_screen.dart';
import '../../features/security/presentation/screens/verification_progress_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/sync/presentation/screens/sync_screen.dart';
import '../../features/tracking/presentation/screens/tracking_screen.dart';
import 'app_routes.dart';
import 'widgets/app_navigation_shell.dart';

final appRouterProvider = Provider<GoRouter>(
  (ref) => GoRouter(
    initialLocation: AppRoutes.splash,
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, _) =>
            SplashScreen(onReady: () => context.go(AppRoutes.login)),
      ),
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, _) => LoginScreen(
          onSignIn: (identifier, password) async {
            final success = await ref
                .read(authControllerProvider.notifier)
                .login(identifier, password);
            if (!context.mounted) return;
            if (success) {
              AppFeedback.success(
                context,
                'Welcome back. You’re signed in securely.',
              );
              context.go(
                AppConfig.localMode ? AppRoutes.home : AppRoutes.device,
              );
            } else {
              AppFeedback.error(
                context,
                'We could not sign you in. Check your details and try again.',
              );
            }
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.device,
        name: 'device',
        builder: (context, _) => DeviceRegistrationScreen(
          onRegister: () async {
            final success = await ref
                .read(deviceControllerProvider.notifier)
                .register();
            if (!success || !context.mounted) return;
            final status = ref
                .read(deviceControllerProvider)
                .asData
                ?.value?['status'];
            if (status == 'ACTIVE') context.go(AppRoutes.permissions);
          },
          onContinue: () => context.go(AppRoutes.permissions),
        ),
      ),
      GoRoute(
        path: AppRoutes.permissions,
        name: 'permissions',
        builder: (context, _) => PermissionsOnboardingScreen(
          onContinue: () => context.go(AppRoutes.consent),
        ),
      ),
      GoRoute(
        path: AppRoutes.consent,
        name: 'consent',
        builder: (context, _) => ConsentScreen(
          onAccept: () async {
            final success = await ref
                .read(consentControllerProvider.notifier)
                .accept();
            if (success && context.mounted) context.go(AppRoutes.enrollment);
          },
          onDecline: () => context.go(AppRoutes.home),
          onContinue: () => context.go(AppRoutes.enrollment),
          onWithdraw: () async {
            final withdrawn = await ref
                .read(consentControllerProvider.notifier)
                .withdraw();
            if (withdrawn && context.mounted) {
              AppFeedback.success(context, 'Biometric consent was withdrawn.');
            }
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.enrollment,
        name: 'enrollment',
        builder: (context, _) => EnrollmentScreen(
          onCapture: (file) async {
            final success = await ref
                .read(enrollmentControllerProvider.notifier)
                .enroll(file.path);
            if (success && context.mounted) context.go(AppRoutes.home);
          },
          onContinue: () => context.go(AppRoutes.home),
          onConsentRequired: () => context.go(AppRoutes.consent),
        ),
      ),
      StatefulShellRoute.indexedStack(
        pageBuilder: (context, state, navigationShell) => NoTransitionPage(
          key: state.pageKey,
          child: AppNavigationShell(navigationShell: navigationShell),
        ),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.home,
                name: 'home',
                builder: (context, _) => HomeScreen(
                  onCheckIn: () => context.push(AppRoutes.punchCamera),
                  onHistory: () => context.go(AppRoutes.history),
                  onRequests: () => context.go(AppRoutes.requests),
                  onProfile: () => context.go(AppRoutes.profile),
                  onNotifications: () => context.push(AppRoutes.notifications),
                  onMore: (destination) {
                    final path = switch (destination) {
                      'break' => AppRoutes.breakFlow,
                      'tracking' => AppRoutes.tracking,
                      'sync' => AppRoutes.sync,
                      'settings' => AppRoutes.settings,
                      'failure' => AppRoutes.punchFailure,
                      _ => AppRoutes.login,
                    };
                    context.push(path);
                  },
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.history,
                name: 'history',
                builder: (context, _) => HistoryScreen(
                  onDay: (date) =>
                      context.push('${AppRoutes.dayDetail}?date=$date'),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.requests,
                name: 'requests',
                builder: (_, _) => const MyRequestsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.profile,
                name: 'profile',
                builder: (context, _) => ProfileScreen(
                  onSettings: () => context.push(AppRoutes.settings),
                ),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.punchCamera,
        name: 'punchCamera',
        builder: (context, _) {
          final phase = ref
              .read(attendanceControllerProvider)
              .asData
              ?.value
              .phase;
          final isCheckOut =
              phase == AttendancePhase.checkedIn ||
              phase == AttendancePhase.onBreak;
          return PunchCameraScreen(
            isCheckOut: isCheckOut,
            onCaptured: (file) async {
              if (!context.mounted) return;
              context.pushReplacement(
                AppRoutes.verifying,
                extra: PunchCapture(
                  filePath: file.path,
                  isCheckOut: isCheckOut,
                ),
              );
            },
          );
        },
      ),
      GoRoute(
        path: AppRoutes.verifying,
        name: 'verifying',
        builder: (context, state) {
          final capture = state.extra as PunchCapture?;
          if (capture == null) {
            return PunchFailureScreen(
              onRetry: () => context.pushReplacement(AppRoutes.punchCamera),
              onRegularization: () => context.push(AppRoutes.regularization),
            );
          }
          return VerificationProgressScreen(
            verify: () => ref
                .read(attendanceControllerProvider.notifier)
                .verifyPunch(capture),
            onSuccess: () => context.pushReplacement(AppRoutes.punchSuccess),
            onFailure: () => context.pushReplacement(AppRoutes.punchFailure),
          );
        },
      ),
      GoRoute(
        path: AppRoutes.punchSuccess,
        name: 'punchSuccess',
        builder: (context, _) => PunchSuccessScreen(
          onDone: () => context.go(AppRoutes.home),
          onTimeline: () => context.pushReplacement(AppRoutes.dayDetail),
        ),
      ),
      GoRoute(
        path: AppRoutes.punchFailure,
        name: 'punchFailure',
        builder: (context, _) => PunchFailureScreen(
          onRetry: () => context.pushReplacement(AppRoutes.punchCamera),
          onRegularization: () => context.push(AppRoutes.regularization),
        ),
      ),
      GoRoute(
        path: AppRoutes.breakFlow,
        name: 'breakFlow',
        builder: (context, _) {
          final isOnBreak =
              ref.read(attendanceControllerProvider).asData?.value.phase ==
              AttendancePhase.onBreak;
          return BreakScreen(
            isOnBreak: isOnBreak,
            onToggle: () async {
              final controller = ref.read(
                attendanceControllerProvider.notifier,
              );
              if (isOnBreak) {
                await controller.endBreak();
              } else {
                await controller.startBreak();
              }
              if (context.mounted) {
                AppFeedback.success(
                  context,
                  isOnBreak
                      ? 'Your break has ended.'
                      : 'Your break has started.',
                );
                context.go(AppRoutes.home);
              }
            },
          );
        },
      ),
      GoRoute(
        path: AppRoutes.dayDetail,
        name: 'dayDetail',
        builder: (context, state) => DayDetailScreen(
          date:
              state.uri.queryParameters['date'] ??
              DateTime.now().toIso8601String().split('T').first,
          onCorrection: () => context.push(AppRoutes.regularization),
        ),
      ),
      GoRoute(
        path: AppRoutes.regularization,
        name: 'regularization',
        builder: (context, _) => RegularizationScreen(
          onSubmit: () => context.pushReplacement(AppRoutes.requests),
        ),
      ),
      GoRoute(
        path: AppRoutes.tracking,
        name: 'tracking',
        builder: (_, _) => const TrackingScreen(),
      ),
      GoRoute(
        path: AppRoutes.sync,
        name: 'sync',
        builder: (_, _) => const SyncScreen(),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        name: 'notifications',
        builder: (_, _) => const NotificationsScreen(),
      ),
      GoRoute(
        path: AppRoutes.settings,
        name: 'settings',
        builder: (_, _) => const SettingsScreen(),
      ),
    ],
  ),
);

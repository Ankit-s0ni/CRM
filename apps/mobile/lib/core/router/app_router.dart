import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../network/network_providers.dart';
import '../widgets/app_feedback.dart';
import '../tenant/tenant_controller.dart';
import '../tenant/tenant_config.dart';
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
import '../../features/leave/presentation/screens/leave_apply_screen.dart';
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
import 'widgets/feature_unavailable_screen.dart';

final appRouterProvider = Provider<GoRouter>(
  (ref) => GoRouter(
    initialLocation: AppRoutes.splash,
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, _) => SplashScreen(
          onReady: () async {
            final restored = await ref
                .read(authControllerProvider.notifier)
                .restoreSession();
            if (!context.mounted) return;
            context.go(
              restored
                  ? ref
                        .read(tenantControllerProvider.notifier)
                        .nextRequiredRoute()
                  : AppRoutes.login,
            );
          },
        ),
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
                ref.read(tenantControllerProvider.notifier).nextRequiredRoute(),
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
            if (status == 'ACTIVE') {
              await ref
                  .read(tenantControllerProvider.notifier)
                  .refreshRuntime();
              if (context.mounted) {
                context.go(
                  ref
                      .read(tenantControllerProvider.notifier)
                      .nextRequiredRoute(),
                );
              }
            }
          },
          onContinue: () async {
            final rebound = await ref.read(apiServiceProvider).refreshSession();
            if (!context.mounted) return;
            if (!rebound) {
              AppFeedback.error(
                context,
                'Your approved device could not be linked to this session. Sign in again and retry.',
              );
              return;
            }
            try {
              await ref
                  .read(tenantControllerProvider.notifier)
                  .refreshRuntime();
            } catch (_) {
              if (context.mounted) {
                AppFeedback.error(
                  context,
                  'Device approval could not be confirmed. Check your connection and retry.',
                );
              }
              return;
            }
            if (context.mounted) {
              final next = ref
                  .read(tenantControllerProvider.notifier)
                  .nextRequiredRoute();
              if (next == AppRoutes.device) {
                AppFeedback.error(
                  context,
                  'This installation is still awaiting approval. Check the status again.',
                );
                return;
              }
              context.go(next);
            }
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.permissions,
        name: 'permissions',
        builder: (context, _) => PermissionsOnboardingScreen(
          onContinue: () => context.go(
            ref.read(tenantControllerProvider.notifier).nextAfterPermissions(),
          ),
        ),
      ),
      GoRoute(
        path: AppRoutes.consent,
        name: 'consent',
        builder: (context, _) {
          final runtime = ref.read(tenantControllerProvider);
          if (!runtime.attendancePolicy.requiresFace) {
            return FeatureUnavailableScreen(
              title: 'Biometric consent is not required',
              message:
                  'Your attendance policy uses location-only verification and does not require face capture.',
              onBack: () => context.go(AppRoutes.home),
            );
          }
          return ConsentScreen(
            onAccept: () async {
              final success = await ref
                  .read(consentControllerProvider.notifier)
                  .accept();
              if (success) {
                await ref
                    .read(tenantControllerProvider.notifier)
                    .refreshRuntime();
              }
              if (success && context.mounted) {
                context.go(
                  ref
                      .read(tenantControllerProvider.notifier)
                      .nextAfterPermissions(),
                );
              }
            },
            onDecline: () => context.go(AppRoutes.home),
            onContinue: () => context.go(
              ref
                  .read(tenantControllerProvider.notifier)
                  .nextAfterPermissions(),
            ),
            onWithdraw: () async {
              final withdrawn = await ref
                  .read(consentControllerProvider.notifier)
                  .withdraw();
              if (withdrawn && context.mounted) {
                AppFeedback.success(
                  context,
                  'Biometric consent was withdrawn.',
                );
              }
            },
          );
        },
      ),
      GoRoute(
        path: AppRoutes.enrollment,
        name: 'enrollment',
        builder: (context, _) {
          final runtime = ref.read(tenantControllerProvider);
          if (!runtime.attendancePolicy.requiresFace) {
            return FeatureUnavailableScreen(
              title: 'Face enrollment is not required',
              message:
                  'Your attendance policy uses location-only verification and does not require a face profile.',
              onBack: () => context.go(AppRoutes.home),
            );
          }
          return EnrollmentScreen(
            onCapture: (file) async {
              final success = await ref
                  .read(enrollmentControllerProvider.notifier)
                  .enroll(file.path);
              if (success) {
                await ref
                    .read(tenantControllerProvider.notifier)
                    .refreshRuntime();
              }
              if (success && context.mounted) context.go(AppRoutes.home);
            },
            onContinue: () => context.go(AppRoutes.home),
            onConsentRequired: () => context.go(AppRoutes.consent),
          );
        },
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
                  onCheckIn: () {
                    final policy = ref
                        .read(tenantControllerProvider)
                        .attendancePolicy;
                    if (!policy.canPunch) {
                      context.push(AppRoutes.punchCamera);
                      return;
                    }
                    final phase = ref
                        .read(attendanceControllerProvider)
                        .asData
                        ?.value
                        .phase;
                    final isCheckOut =
                        phase == AttendancePhase.checkedIn ||
                        phase == AttendancePhase.onBreak;
                    if (policy.selfieMode == AttendanceSelfieMode.disabled) {
                      context.push(
                        AppRoutes.verifying,
                        extra: PunchCapture(isCheckOut: isCheckOut),
                      );
                    } else {
                      context.push(AppRoutes.punchCamera);
                    }
                  },
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
                builder: (context, _) => MyRequestsScreen(
                  onApplyLeave: () => context.push(AppRoutes.leaveApply),
                ),
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
                  onLogout: () async {
                    await ref.read(authControllerProvider.notifier).logout();
                    if (context.mounted) context.go(AppRoutes.login);
                  },
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
          final runtime = ref.read(tenantControllerProvider);
          if (!runtime.attendancePolicy.canPunch) {
            return FeatureUnavailableScreen(
              title: 'Attendance is unavailable',
              message:
                  'Your workspace or policy does not currently allow attendance punches.',
              onBack: () => context.go(AppRoutes.home),
            );
          }
          if (runtime.attendancePolicy.selfieMode ==
              AttendanceSelfieMode.disabled) {
            return FeatureUnavailableScreen(
              title: 'Camera is not required',
              message:
                  'Your attendance policy uses location-only verification. Return home and check in without a selfie.',
              onBack: () => context.go(AppRoutes.home),
            );
          }
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
              onRetry: () => _retryPunch(ref, context),
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
          onRetry: () => _retryPunch(ref, context),
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
          onCorrection: (attendanceLogId, date) => context.push(
            '${AppRoutes.regularization}?attendanceLogId=$attendanceLogId&date=$date',
          ),
        ),
      ),
      GoRoute(
        path: AppRoutes.regularization,
        name: 'regularization',
        builder: (context, state) =>
            ref
                .read(tenantControllerProvider)
                .hasModule(TenantModule.regularization)
            ? RegularizationScreen(
                onSubmit: () => context.pushReplacement(AppRoutes.requests),
                attendanceLogId: state.uri.queryParameters['attendanceLogId'],
                attendanceDate: state.uri.queryParameters['date'],
              )
            : FeatureUnavailableScreen(
                title: 'Requests are unavailable',
                message: 'Regularization is not enabled for this workspace.',
                onBack: () => context.go(AppRoutes.home),
              ),
      ),
      GoRoute(
        path: AppRoutes.leaveApply,
        name: 'leaveApply',
        builder: (context, _) =>
            ref.read(tenantControllerProvider).hasModule(TenantModule.leave)
            ? LeaveApplyScreen(
                onSubmitted: () => context.go(AppRoutes.requests),
              )
            : FeatureUnavailableScreen(
                title: 'Leave is unavailable',
                message: 'Leave management is not enabled for this workspace.',
                onBack: () => context.go(AppRoutes.requests),
              ),
      ),
      GoRoute(
        path: AppRoutes.tracking,
        name: 'tracking',
        builder: (context, _) =>
            ref
                .read(tenantControllerProvider)
                .hasModule(TenantModule.fieldTracking)
            ? const TrackingScreen()
            : FeatureUnavailableScreen(
                title: 'Field tracking is unavailable',
                message:
                    'Your tenant entitlement, attendance policy, or work type does not permit field tracking.',
                onBack: () => context.go(AppRoutes.home),
              ),
      ),
      GoRoute(
        path: AppRoutes.sync,
        name: 'sync',
        builder: (_, _) => const SyncScreen(),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        name: 'notifications',
        builder: (context, _) => NotificationsScreen(
          onOpenAction: (actionUrl) {
            if (actionUrl?.startsWith('/leave/') == true ||
                actionUrl?.startsWith('/requests/') == true) {
              context.go(AppRoutes.requests);
            }
          },
        ),
      ),
      GoRoute(
        path: AppRoutes.settings,
        name: 'settings',
        builder: (_, _) => const SettingsScreen(),
      ),
    ],
  ),
);

void _retryPunch(Ref ref, BuildContext context) {
  final policy = ref.read(tenantControllerProvider).attendancePolicy;
  if (policy.selfieMode == AttendanceSelfieMode.required) {
    context.pushReplacement(AppRoutes.punchCamera);
    return;
  }
  final phase = ref.read(attendanceControllerProvider).asData?.value.phase;
  context.pushReplacement(
    AppRoutes.verifying,
    extra: PunchCapture(
      isCheckOut:
          phase == AttendancePhase.checkedIn ||
          phase == AttendancePhase.onBreak,
    ),
  );
}

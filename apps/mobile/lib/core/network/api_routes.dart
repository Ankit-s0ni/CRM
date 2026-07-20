// GENERATED FILE. Run `pnpm openapi:generate`; do not edit manually.
class ApiRoutes {
  ApiRoutes._();

  static const login = '/auth/login';
  static const mobileLogin = '/auth/mobile-login';
  static const refresh = '/auth/refresh';
  static const logout = '/auth/logout';
  static const me = '/auth/me';
  static const devices = '/devices';
  static const registerDevice = '/devices/register';
  static const myDevice = '/devices/me';
  static const myConsent = '/biometric-consents/me';
  static const biometricConsents = '/biometric-consents';
  static const enrollmentPresign = '/face-enrollments/presign';
  static const faceEnrollments = '/face-enrollments';
  static const enrollmentStatus = '/face-enrollments/me/status';
  static const punches = '/attendance/punches';
  static const punchEvidencePresign = '/attendance/punch-evidence/presign';
  static const integrityChallenge = '/attendance/integrity/challenges';
  static const attendanceToday = '/attendance/me/today';
  static const attendanceHistory = '/attendance/me/history';
  static const breakStart = '/attendance/break-start';
  static const breakEnd = '/attendance/break-end';
  static const profile = '/employees/me';
  static const verificationLogs = '/verification-logs';
  static const securityAlerts = '/security-alerts';
  static const fieldSessionStart = '/field-sessions/start';
  static const fieldSessionActive = '/field-sessions/me/active';
  static const fieldPingsBatch = '/field-pings/batch';
  static const attendanceSync = '/attendance/sync';
  static const mobileRuntimeConfig = '/mobile/runtime-config';
  static const regularizations = '/regularizations';
  static const myRegularizations = '/regularizations/me';
  static const leavePolicies = '/leave-policies';
  static const myLeaveBalances = '/leave-balances/me';
  static const leaveRequests = '/leave-requests';
  static const notifications = '/notifications';
  static const notificationUnreadCount = '/notifications/unread-count';
  static const notificationReadAll = '/notifications/read-all';
  static const preferences = '/employees/me/preferences';

  static String approveDevice(String id) => '/devices/$id/approve';
  static String blockDevice(String id) => '/devices/$id/block';
  static String replaceDevice(String id) => '/devices/$id/replace';
  static String attendanceDay(String date) => '/attendance/me/day?date=$date';
  static String securityAlert(String id) => '/security-alerts/$id';
  static String fieldSessionStop(String id) => '/field-sessions/$id/stop';
  static String attendanceSyncStatus(String clientEventUuid) =>
      '/attendance/sync/$clientEventUuid';
  static String cancelRegularization(String id) =>
      '/regularizations/$id/cancel';
  static String cancelLeaveRequest(String id) => '/leave-requests/$id/cancel';
  static String markNotificationRead(String id) => '/notifications/$id/read';
}

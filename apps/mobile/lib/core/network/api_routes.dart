// GENERATED FILE. Run `pnpm mobile:contracts:generate`; do not edit manually.
class ApiRoutes {
  ApiRoutes._();

  static const login = '/auth/login';
  static const mobileLogin = '/auth/mobile-login';
  static const refresh = '/auth/refresh';
  static const logout = '/auth/logout';
  static const changePassword = '/auth/change-password';
  static const me = '/auth/me';
  static const productToken = '/product-integration/token';
  static const notifications = '/notifications';
  static const notificationUnreadCount = '/notifications/unread-count';
  static const notificationReadAll = '/notifications/read-all';
  static const registerDevice = '/api/hrms/v1/devices/register';
  static const myDevice = '/api/hrms/v1/devices/me';
  static const myConsent = '/api/hrms/v1/biometric-consents/me';
  static const enrollmentPresign = '/api/hrms/v1/face-enrollments/me/presign';
  static const faceEnrollments = '/api/hrms/v1/face-enrollments/me';
  static const enrollmentStatus = '/api/hrms/v1/face-enrollments/me/status';
  static const punches = '/api/hrms/v1/attendance/me/punch';
  static const punchEvidencePresign = '/api/hrms/v1/attendance/evidence/presign';
  static const integrityChallenge = '/api/hrms/v1/attendance/integrity/challenges';
  static const attendanceToday = '/api/hrms/v1/attendance/me/today';
  static const attendanceHistory = '/api/hrms/v1/attendance/me/history';
  static const profile = '/api/hrms/v1/employees/me';
  static const verificationLogs = '/api/hrms/v1/attendance/verification-logs/me';
  static const securityAlerts = '/api/hrms/v1/security-alerts/me';
  static const fieldSessionStart = '/api/hrms/v1/field-sessions';
  static const fieldSessionActive = '/api/hrms/v1/field-sessions/me/active';
  static const fieldPingsBatch = '/api/hrms/v1/field-pings/batch';
  static const fieldTrackingConsent = '/api/hrms/v1/field-tracking/consent';
  static const attendanceSync = '/api/hrms/v1/attendance/sync';
  static const mobileRuntimeConfig = '/api/hrms/v1/mobile/runtime-config';
  static const regularizations = '/api/hrms/v1/regularizations';
  static const myRegularizations = '/api/hrms/v1/regularizations/me';
  static const leavePolicies = '/api/hrms/v1/leave/policies';
  static const myLeaveBalances = '/api/hrms/v1/leave/balances/me';
  static const leaveRequests = '/api/hrms/v1/leave/requests';
  static const preferences = '/api/hrms/v1/employees/me/preferences';

  static const devices = '/api/hrms/v1/devices';
  static const biometricConsents = '/api/hrms/v1/biometric-consents/me';
  static String approveDevice(String id) => '/api/hrms/v1/devices/$id/approve';
  static String blockDevice(String id) => '/api/hrms/v1/devices/$id/block';
  static String replaceDevice(String id) => '/api/hrms/v1/devices/$id/replace';
  static String attendanceDay(String date) => '/api/hrms/v1/attendance/me/day?date=$date';
  static String fieldSessionStop(String id) => '/api/hrms/v1/field-sessions/$id/stop';
  static String attendanceSyncStatus(String id) => '/api/hrms/v1/attendance/sync/$id';
  static String cancelRegularization(String id) => '/api/hrms/v1/regularizations/$id/cancel';
  static String cancelLeaveRequest(String id) => '/api/hrms/v1/leave/requests/$id/cancel';
  static String markNotificationRead(String id) => '/notifications/$id/read';
}

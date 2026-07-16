class ApiRoutes {
  ApiRoutes._();

  static const login = '/auth/login';
  static const refresh = '/auth/refresh';
  static const logout = '/auth/logout';
  static const me = '/auth/me';

  static const devices = '/devices';
  static const registerDevice = '/devices/register';
  static const myDevice = '/devices/me';
  static String approveDevice(String id) => '/devices/$id/approve';
  static String blockDevice(String id) => '/devices/$id/block';
  static String replaceDevice(String id) => '/devices/$id/replace';

  static const myConsent = '/biometric-consents/me';
  static const biometricConsents = '/biometric-consents';
  static const enrollmentPresign = '/face-enrollments/presign';
  static const faceEnrollments = '/face-enrollments';
  static const enrollmentStatus = '/face-enrollments/me/status';

  static const punches = '/attendance/punches';
  static const attendanceHistory = '/attendance/history';
  static String attendanceDay(String date) => '/attendance/days/$date';
  static const breaks = '/attendance/breaks';

  static const regularizations = '/regularizations';
  static const myRegularizations = '/regularizations/me';
  static const leaveRequests = '/leave/requests';

  static const fieldSessions = '/field-sessions';
  static const fieldPings = '/field-pings';
  static const offlineSync = '/attendance/offline-sync';

  static const notifications = '/notifications';
  static const notificationReadAll = '/notifications/read-all';
  static const profile = '/employees/me';
  static const preferences = '/employees/me/preferences';

  static const verificationLogs = '/verification-logs';
  static const securityAlerts = '/security-alerts';
  static String securityAlert(String id) => '/security-alerts/$id';
}

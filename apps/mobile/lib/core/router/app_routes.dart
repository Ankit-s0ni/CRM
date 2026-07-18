class AppRoutes {
  AppRoutes._();

  static const splash = '/';
  static const login = '/login';
  static const device = '/device-registration';
  static const permissions = '/permissions';
  static const consent = '/biometric-consent';
  static const enrollment = '/face-enrollment';
  static const home = '/home';
  static const punchCamera = '/attendance/punch-camera';
  static const verifying = '/attendance/verifying';
  static const punchSuccess = '/attendance/success';
  static const punchFailure = '/attendance/failure';
  static const breakFlow = '/attendance/break';
  static const history = '/attendance/history';
  static const dayDetail = '/attendance/day-detail';
  static const regularization = '/requests/regularization';
  static const requests = '/requests';
  static const leaveApply = '/requests/leave/apply';
  static const tracking = '/field-tracking';
  static const sync = '/offline-sync';
  static const notifications = '/notifications';
  static const profile = '/profile';
  static const settings = '/settings';
}

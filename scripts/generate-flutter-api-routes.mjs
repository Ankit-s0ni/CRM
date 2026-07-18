import { readFile, writeFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile('docs/openapi.json', 'utf8'));
const routes = [
  ['login', '/auth/login', true],
  ['refresh', '/auth/refresh', true],
  ['logout', '/auth/logout', true],
  ['me', '/auth/me', true],
  ['devices', '/devices', true],
  ['registerDevice', '/devices/register', true],
  ['myDevice', '/devices/me', true],
  ['myConsent', '/biometric-consents/me', true],
  ['biometricConsents', '/biometric-consents', true],
  ['enrollmentPresign', '/face-enrollments/presign', true],
  ['faceEnrollments', '/face-enrollments', true],
  ['enrollmentStatus', '/face-enrollments/me/status', true],
  ['punches', '/attendance/punches', true],
  ['punchEvidencePresign', '/attendance/punch-evidence/presign', true],
  ['integrityChallenge', '/attendance/integrity/challenges', true],
  ['attendanceToday', '/attendance/me/today', true],
  ['attendanceHistory', '/attendance/me/history', true],
  ['breakStart', '/attendance/break-start', true],
  ['breakEnd', '/attendance/break-end', true],
  ['profile', '/employees/me', true],
  ['verificationLogs', '/verification-logs', true],
  ['securityAlerts', '/security-alerts', true],
  ['fieldSessionStart', '/field-sessions/start', true],
  ['fieldSessionActive', '/field-sessions/me/active', true],
  ['fieldPingsBatch', '/field-pings/batch', true],
  ['attendanceSync', '/attendance/sync', true],
  ['mobileRuntimeConfig', '/mobile/runtime-config', true],
  ['regularizations', '/regularizations', true],
  ['myRegularizations', '/regularizations/me', true],
  ['leavePolicies', '/leave-policies', true],
  ['myLeaveBalances', '/leave-balances/me', true],
  ['leaveRequests', '/leave-requests', true],
  ['notifications', '/notifications', true],
  ['notificationUnreadCount', '/notifications/unread-count', true],
  ['notificationReadAll', '/notifications/read-all', true],
  ['preferences', '/employees/me/preferences', false],
];

const missing = routes
  .filter(([, path, required]) => required && !contract.paths[path])
  .map(([, path]) => path);
for (const path of [
  '/devices/{id}/approve',
  '/devices/{id}/block',
  '/devices/{id}/replace',
  '/attendance/me/day',
  '/security-alerts/{id}',
  '/field-sessions/{id}/stop',
  '/attendance/sync/{clientEventUuid}',
  '/regularizations/{id}/cancel',
  '/leave-requests/{id}/cancel',
  '/notifications/{id}/read',
]) {
  if (!contract.paths[path]) missing.push(path);
}
if (missing.length) {
  throw new Error(`Flutter API contract drift: ${missing.join(', ')}`);
}

const constants = routes
  .map(([name, path]) => `  static const ${name} = '${path}';`)
  .join('\n');
const source = `// GENERATED FILE. Run \`pnpm openapi:generate\`; do not edit manually.
class ApiRoutes {
  ApiRoutes._();

${constants}

  static String approveDevice(String id) => '/devices/\$id/approve';
  static String blockDevice(String id) => '/devices/\$id/block';
  static String replaceDevice(String id) => '/devices/\$id/replace';
  static String attendanceDay(String date) => '/attendance/me/day?date=\$date';
  static String securityAlert(String id) => '/security-alerts/\$id';
  static String fieldSessionStop(String id) => '/field-sessions/\$id/stop';
  static String attendanceSyncStatus(String clientEventUuid) =>
      '/attendance/sync/\$clientEventUuid';
  static String cancelRegularization(String id) =>
      '/regularizations/\$id/cancel';
  static String cancelLeaveRequest(String id) => '/leave-requests/\$id/cancel';
  static String markNotificationRead(String id) => '/notifications/\$id/read';
}
`;

await writeFile('apps/mobile/lib/core/network/api_routes.dart', source);

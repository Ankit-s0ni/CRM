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
  ['attendanceToday', '/attendance/me/today', true],
  ['attendanceHistory', '/attendance/me/history', true],
  ['breakStart', '/attendance/break-start', true],
  ['breakEnd', '/attendance/break-end', true],
  ['profile', '/employees/me', true],
  ['verificationLogs', '/verification-logs', true],
  ['securityAlerts', '/security-alerts', true],
  // These repositories belong to later sprints and remain feature-gated.
  ['regularizations', '/regularizations', false],
  ['myRegularizations', '/regularizations/me', false],
  ['leaveRequests', '/leave/requests', false],
  ['fieldSessions', '/field-sessions', false],
  ['fieldPings', '/field-pings', false],
  ['offlineSync', '/attendance/offline-sync', false],
  ['notifications', '/notifications', false],
  ['notificationReadAll', '/notifications/read-all', false],
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
}
`;

await writeFile('apps/mobile/lib/core/network/api_routes.dart', source);

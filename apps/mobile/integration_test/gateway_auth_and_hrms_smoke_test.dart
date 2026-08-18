import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

const gatewayUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:4080',
);
const testEmail = String.fromEnvironment('E2E_EMAIL');
const testPassword = String.fromEnvironment('E2E_PASSWORD');
const testDeviceUuid = String.fromEnvironment(
  'E2E_DEVICE_UUID',
  defaultValue: '40000000-0000-4000-8000-000000000099',
);

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'Platform login exchanges an HRMS token and both authorities reject the wrong token',
    (_) async {
      final client = Dio(
        BaseOptions(
          baseUrl: gatewayUrl,
          validateStatus: (_) => true,
          headers: {'accept': 'application/json'},
        ),
      );
      final login = await client.post<Map<String, dynamic>>(
        '/auth/mobile-login',
        data: {
          'email': testEmail,
          'password': testPassword,
          'deviceUuid': testDeviceUuid,
        },
      );
      expect(login.statusCode, 200, reason: '${login.data}');
      final platformToken = login.data?['accessToken'];
      final refreshToken = login.data?['refreshToken'];
      final user = login.data?['user'];
      final workspace = user is Map<String, dynamic> ? user['workspace'] : null;
      expect(platformToken, isA<String>());
      expect(refreshToken, isA<String>());
      expect(workspace, isA<String>());

      final platformHeaders = {
        'authorization': 'Bearer $platformToken',
        'x-workspace-subdomain': workspace,
      };
      final exchange = await client.post<Map<String, dynamic>>(
        '/product-integration/token',
        data: {'audience': 'hrms-api'},
        options: Options(headers: platformHeaders),
      );
      expect(exchange.statusCode, 201, reason: '${exchange.data}');
      final productToken = exchange.data?['accessToken'];
      expect(productToken, isA<String>());

      final hrmsHeaders = {
        'authorization': 'Bearer $productToken',
        'x-workspace-subdomain': workspace,
        'x-device-uuid': testDeviceUuid,
      };
      final registration = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/devices/register',
        data: {
          'deviceUuid': testDeviceUuid,
          'platform': 'IOS',
          'deviceModel': 'iOS integration simulator',
          'osVersion': '26.5',
          'appVersion': '1.0.0-local',
        },
        options: Options(headers: hrmsHeaders),
      );
      expect(
        registration.statusCode,
        anyOf(200, 201),
        reason: '${registration.data}',
      );
      for (final route in const [
        '/api/hrms/v1/mobile/runtime-config',
        '/api/hrms/v1/employees/me',
        '/api/hrms/v1/attendance/me/today',
      ]) {
        final response = await client.get<Map<String, dynamic>>(
          route,
          options: Options(headers: hrmsHeaders),
        );
        expect(response.statusCode, 200, reason: '$route: ${response.data}');
        expect(response.data?['data'], isNotNull, reason: route);
      }

      final runtime = await client.get<Map<String, dynamic>>(
        '/api/hrms/v1/mobile/runtime-config',
        options: Options(headers: hrmsHeaders),
      );
      final modules = runtime.data?['data']?['modules'];
      expect(modules?['attendance']?['enabled'], isTrue);
      expect(modules?['leave']?['enabled'], isTrue);
      expect(modules?['regularization']?['enabled'], isTrue);
      expect(modules?['fieldTracking']?['enabled'], isTrue);
      expect(modules?['biometrics']?['enabled'], isTrue);

      for (final route in const [
        '/api/hrms/v1/employees/me/preferences',
        '/api/hrms/v1/devices/me',
        '/api/hrms/v1/biometric-consents/me',
        '/api/hrms/v1/face-enrollments/me/status',
        '/api/hrms/v1/leave/policies',
        '/api/hrms/v1/leave/balances/me',
        '/api/hrms/v1/leave/requests',
        '/api/hrms/v1/regularizations/me',
        '/api/hrms/v1/attendance/verification-logs/me',
        '/api/hrms/v1/security-alerts/me',
        '/api/hrms/v1/field-tracking/consent',
      ]) {
        final response = await client.get<Map<String, dynamic>>(
          route,
          options: Options(headers: hrmsHeaders),
        );
        expect(response.statusCode, 200, reason: '$route: ${response.data}');
      }

      final preferences = await client.patch<Map<String, dynamic>>(
        '/api/hrms/v1/employees/me/preferences',
        data: {
          'attendanceReminders': true,
          'fieldTrackingReminders': true,
          'defaultAttendanceView': 'TODAY',
        },
        options: Options(headers: hrmsHeaders),
      );
      expect(preferences.statusCode, 200, reason: '${preferences.data}');

      final consent = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/biometric-consents/me',
        data: {'policyVersion': 'local-e2e-v1'},
        options: Options(headers: hrmsHeaders),
      );
      expect(consent.statusCode, anyOf(200, 201), reason: '${consent.data}');

      final enrollmentPresign = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/face-enrollments/me/presign',
        data: {
          'filename': 'local-e2e-face.jpg',
          'contentType': 'image/jpeg',
          'fileSize': 4,
        },
        options: Options(headers: hrmsHeaders),
      );
      expect(
        enrollmentPresign.statusCode,
        anyOf(200, 201),
        reason: '${enrollmentPresign.data}',
      );
      final enrollmentUpload = enrollmentPresign.data?['data'];
      final uploadUrl = enrollmentUpload?['uploadUrl'] as String;
      final objectKey = enrollmentUpload?['objectKey'] as String;
      final upload = await Dio().put<void>(
        uploadUrl,
        data: Uint8List.fromList(<int>[0xff, 0xd8, 0xff, 0xd9]),
        options: Options(
          headers: {'content-type': 'image/jpeg'},
          contentType: 'image/jpeg',
        ),
      );
      expect(upload.statusCode, anyOf(200, 204));
      final enrollment = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/face-enrollments/me',
        data: {'objectKey': objectKey},
        options: Options(headers: hrmsHeaders),
      );
      expect(
        enrollment.statusCode,
        anyOf(200, 201),
        reason: '${enrollment.data}',
      );
      final enrollmentStatus = await client.get<Map<String, dynamic>>(
        '/api/hrms/v1/face-enrollments/me/status',
        options: Options(headers: hrmsHeaders),
      );
      expect(enrollmentStatus.data?['data']?['enrolled'], isTrue);

      final eventIds = List.generate(4, (_) => nextUuid());
      final eventTypes = ['CHECKIN', 'BREAK_START', 'BREAK_END'];
      for (var index = 0; index < eventTypes.length; index += 1) {
        final punch = await client.post<Map<String, dynamic>>(
          '/api/hrms/v1/attendance/me/punch',
          data: {
            'eventType': eventTypes[index],
            'clientEventUuid': eventIds[index],
            'source': 'MOBILE',
            'eventTime': DateTime.now().toUtc().toIso8601String(),
            'deviceUuid': testDeviceUuid,
            'integrityToken': 'dev-integrity-ok',
            'appVersion': '1.0.0-local',
            'osVersion': 'simulator',
          },
          options: Options(headers: hrmsHeaders),
        );
        expect(punch.statusCode, 200, reason: '${punch.data}');
      }

      final today = await client.get<Map<String, dynamic>>(
        '/api/hrms/v1/attendance/me/today',
        options: Options(headers: hrmsHeaders),
      );
      final todayData = today.data?['data'] as Map<String, dynamic>;
      final attendanceDate = todayData['attendanceDate'].toString().substring(
        0,
        10,
      );
      final attendanceLog = todayData['log'] as Map<String, dynamic>;
      expect(todayData['timeline'], isA<List<dynamic>>());
      expect((todayData['timeline'] as List).length, greaterThanOrEqualTo(3));

      final history = await client.get<Map<String, dynamic>>(
        '/api/hrms/v1/attendance/me/history',
        queryParameters: {
          'from': attendanceDate,
          'to': attendanceDate,
          'limit': 31,
        },
        options: Options(headers: hrmsHeaders),
      );
      expect(history.statusCode, 200, reason: '${history.data}');
      final day = await client.get<Map<String, dynamic>>(
        '/api/hrms/v1/attendance/me/day',
        queryParameters: {'date': attendanceDate},
        options: Options(headers: hrmsHeaders),
      );
      expect(day.statusCode, 200, reason: '${day.data}');

      final sync = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/attendance/sync',
        data: {
          'items': [
            {
              'eventType': 'CHECKIN',
              'clientEventUuid': eventIds.first,
              'source': 'MOBILE',
              'eventTime': DateTime.now().toUtc().toIso8601String(),
              'deviceUuid': testDeviceUuid,
              'integrityToken': 'dev-integrity-ok',
            },
          ],
        },
        options: Options(headers: hrmsHeaders),
      );
      expect(sync.statusCode, anyOf(200, 201), reason: '${sync.data}');
      final receipt = await client.get<Map<String, dynamic>>(
        '/api/hrms/v1/attendance/sync/${eventIds.first}',
        options: Options(headers: hrmsHeaders),
      );
      expect(receipt.statusCode, 200, reason: '${receipt.data}');

      final regularization = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/regularizations',
        data: {
          'attendanceLogId': attendanceLog['id'],
          'requestedCheckout': DateTime.now().toUtc().toIso8601String(),
          'reason': 'Local integration correction request',
          'idempotencyKey': nextUuid(),
        },
        options: Options(headers: hrmsHeaders),
      );
      if (regularization.statusCode == 409) {
        expect(
          regularization.data?['code'],
          'REGULARIZATION_ALREADY_EXISTS',
          reason: '${regularization.data}',
        );
      } else {
        expect(
          regularization.statusCode,
          anyOf(200, 201),
          reason: '${regularization.data}',
        );
        final regularizationId = regularization.data?['data']?['id'];
        final cancelRegularization = await client.post<Map<String, dynamic>>(
          '/api/hrms/v1/regularizations/$regularizationId/cancel',
          data: {'reason': 'Integration lifecycle complete'},
          options: Options(headers: hrmsHeaders),
        );
        expect(
          cancelRegularization.statusCode,
          anyOf(200, 201),
          reason: '${cancelRegularization.data}',
        );
      }

      final policies = await client.get<Map<String, dynamic>>(
        '/api/hrms/v1/leave/policies',
        options: Options(headers: hrmsHeaders),
      );
      final policy = (policies.data?['data'] as List<dynamic>).first;
      final leaveDate = DateTime.now().toUtc().add(const Duration(days: 30));
      final leaveDateOnly = leaveDate.toIso8601String().substring(0, 10);
      final leave = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/leave/requests',
        data: {
          'policyId': policy['id'],
          'startDate': leaveDateOnly,
          'endDate': leaveDateOnly,
          'reason': 'Local integration leave request',
        },
        options: Options(headers: hrmsHeaders),
      );
      expect(leave.statusCode, anyOf(200, 201), reason: '${leave.data}');
      final leaveId = leave.data?['data']?['id'];
      final cancelLeave = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/leave/requests/$leaveId/cancel',
        options: Options(headers: hrmsHeaders),
      );
      expect(cancelLeave.statusCode, anyOf(200, 201));

      final fieldRuntime = runtime.data?['data']?['fieldTracking'];
      final fieldConsent = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/field-tracking/consent',
        data: {
          'action': 'GRANTED',
          'noticeVersion': fieldRuntime?['noticeVersion'] ?? '1.0',
          'deviceUuid': testDeviceUuid,
        },
        options: Options(headers: hrmsHeaders),
      );
      expect(
        fieldConsent.statusCode,
        anyOf(200, 201),
        reason: '${fieldConsent.data}',
      );
      final session = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/field-sessions',
        data: {'deviceUuid': testDeviceUuid, 'clientStartUuid': nextUuid()},
        options: Options(headers: hrmsHeaders),
      );
      expect(session.statusCode, anyOf(200, 201), reason: '${session.data}');
      final sessionId = session.data?['data']?['id'];
      final pings = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/field-pings/batch',
        data: {
          'deviceUuid': testDeviceUuid,
          'items': [
            {
              'clientPingUuid': nextUuid(),
              'sessionId': sessionId,
              'latitude': 28.6139,
              'longitude': 77.2090,
              'accuracyM': 10,
              'batteryLevel': 80,
              'isMock': false,
              'capturedAt': DateTime.now().toUtc().toIso8601String(),
              'isOfflineSync': false,
            },
          ],
        },
        options: Options(headers: hrmsHeaders),
      );
      expect(pings.statusCode, anyOf(200, 201), reason: '${pings.data}');
      expect(pings.data?['data']?['outcomes'], isA<List<dynamic>>());
      final activeSession = await client.get<Map<String, dynamic>>(
        '/api/hrms/v1/field-sessions/me/active',
        options: Options(headers: hrmsHeaders),
      );
      expect(activeSession.data?['data']?['id'], sessionId);
      final stopSession = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/field-sessions/$sessionId/stop',
        data: {'endReason': 'MANUAL'},
        options: Options(headers: hrmsHeaders),
      );
      expect(stopSession.statusCode, anyOf(200, 201));

      final checkout = await client.post<Map<String, dynamic>>(
        '/api/hrms/v1/attendance/me/punch',
        data: {
          'eventType': 'CHECKOUT',
          'clientEventUuid': eventIds.last,
          'source': 'MOBILE',
          'eventTime': DateTime.now().toUtc().toIso8601String(),
          'deviceUuid': testDeviceUuid,
          'integrityToken': 'dev-integrity-ok',
          'appVersion': '1.0.0-local',
          'osVersion': 'simulator',
        },
        options: Options(headers: hrmsHeaders),
      );
      expect(checkout.statusCode, 200, reason: '${checkout.data}');

      for (final route in const [
        '/notifications',
        '/notifications/unread-count',
      ]) {
        final response = await client.get<Map<String, dynamic>>(
          route,
          options: Options(headers: platformHeaders),
        );
        expect(response.statusCode, 200, reason: '$route: ${response.data}');
      }

      final platformTokenAgainstHrms = await client.get<Map<String, dynamic>>(
        '/api/hrms/v1/mobile/runtime-config',
        options: Options(headers: platformHeaders),
      );
      expect(platformTokenAgainstHrms.statusCode, 401);
      final productTokenAgainstPlatform = await client
          .get<Map<String, dynamic>>(
            '/auth/me',
            options: Options(headers: hrmsHeaders),
          );
      expect(productTokenAgainstPlatform.statusCode, 401);

      final logout = await client.post<Map<String, dynamic>>(
        '/auth/logout',
        data: {'refreshToken': refreshToken},
        options: Options(headers: platformHeaders),
      );
      expect(logout.statusCode, anyOf(200, 201, 204));
    },
    skip: testEmail.isEmpty || testPassword.isEmpty,
  );
}

int _uuidSequence = 0;

String nextUuid() {
  _uuidSequence += 1;
  final suffix =
      ((DateTime.now().microsecondsSinceEpoch + _uuidSequence) % 1000000000000)
          .toString()
          .padLeft(12, '0');
  return '50000000-0000-4000-8000-$suffix';
}

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/network/api_service.dart';
import 'package:hrms_attendance/core/network/authority_clients.dart';
import 'package:hrms_attendance/core/network/generated/mobile_api_contract.g.dart';
import 'package:hrms_attendance/core/network/token_store.dart';

void main() {
  test('generated punch request preserves the versioned wire contract', () {
    final request = HrmsPunchRequest(
      clientEventUuid: '40000000-0000-4000-8000-000000000001',
      eventType: AttendanceEventType.breakStart,
      eventTime: DateTime.utc(2026, 8, 11, 9),
      deviceUuid: '40000000-0000-4000-8000-000000000002',
    );

    expect(request.toJson(), {
      'clientEventUuid': '40000000-0000-4000-8000-000000000001',
      'eventType': 'BREAK_START',
      'eventTime': '2026-08-11T09:00:00.000Z',
      'source': 'MOBILE',
      'deviceUuid': '40000000-0000-4000-8000-000000000002',
    });
  });

  test('authority clients reject cross-boundary routes before transport', () {
    final session = ApiService(
      TokenStore(const FlutterSecureStorage()),
      dio: Dio(),
      initialHrmsProductToken: 'test',
    );

    expect(
      () => PlatformApiClient(session).get<void>('/api/hrms/v1/employees/me'),
      throwsArgumentError,
    );
    expect(
      () => HrmsApiClient(session).get<void>('/auth/me'),
      throwsArgumentError,
    );
  });

  test('generated artifacts embed both source contract hashes', () {
    expect(platformMobileContractSha256, hasLength(64));
    expect(hrmsMobileContractSha256, hasLength(64));
    expect(hrmsProductContractVersion, '1.1.0');
  });
}

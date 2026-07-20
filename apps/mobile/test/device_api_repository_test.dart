import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/device/device_identity.dart';
import 'package:hrms_attendance/core/network/api_service.dart';
import 'package:hrms_attendance/core/network/token_store.dart';
import 'package:hrms_attendance/features/device/data/device_api_repository.dart';

void main() {
  test('current device lookup is scoped to this installation UUID', () async {
    const deviceUuid = '40000000-0000-4000-8000-000000000001';
    final adapter = _DeviceAdapter();
    final dio = Dio()..httpClientAdapter = adapter;
    final repository = DeviceApiRepository(
      ApiService(TokenStore(const FlutterSecureStorage()), dio: dio),
      _DeviceIdentity(deviceUuid),
    );

    final result = await repository.current();

    expect(adapter.deviceUuid, deviceUuid);
    expect(result['data'], {
      'deviceUuid': deviceUuid,
      'platform': 'ANDROID',
      'deviceModel': 'Test phone',
      'osVersion': '15',
      'appVersion': '1.0.0',
    });
  });
}

class _DeviceIdentity extends DeviceIdentity {
  _DeviceIdentity(this.deviceUuid) : super(const FlutterSecureStorage());

  final String deviceUuid;

  @override
  Future<Map<String, String>> payload() async => {
    'deviceUuid': deviceUuid,
    'platform': 'ANDROID',
    'deviceModel': 'Test phone',
    'osVersion': '15',
    'appVersion': '1.0.0',
  };
}

class _DeviceAdapter implements HttpClientAdapter {
  String? deviceUuid;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    deviceUuid = options.headers['x-device-uuid'] as String?;
    return ResponseBody.fromString(
      jsonEncode({'data': <Object>[]}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

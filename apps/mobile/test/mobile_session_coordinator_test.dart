import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/network/api_routes.dart';
import 'package:hrms_attendance/core/network/api_service.dart';
import 'package:hrms_attendance/core/network/authority_clients.dart';
import 'package:hrms_attendance/core/network/token_store.dart';

void main() {
  test(
    'concurrent HRMS calls single-flight Platform refresh and exchange',
    () async {
      final adapter = _SessionAdapter();
      Dio client() => Dio()..httpClientAdapter = adapter;
      final session = ApiService(
        _MemoryTokenStore(),
        platformDio: client(),
        hrmsDio: client(),
        refreshDio: client(),
      );
      final hrms = HrmsApiClient(session);

      await Future.wait([
        hrms.get<Map<String, dynamic>>(ApiRoutes.profile),
        hrms.get<Map<String, dynamic>>(ApiRoutes.attendanceToday),
        hrms.get<Map<String, dynamic>>(ApiRoutes.mobileRuntimeConfig),
      ]);

      expect(adapter.refreshCalls, 1);
      expect(adapter.exchangeCalls, 1);
      expect(adapter.hrmsCalls, 3);
    },
  );
}

class _MemoryTokenStore extends TokenStore {
  _MemoryTokenStore() : super(const FlutterSecureStorage());
  String? _refresh = 'stored-refresh';

  @override
  Future<String?> readRefreshToken() async => _refresh;
  @override
  Future<void> writeRefreshToken(String value) async => _refresh = value;
  @override
  Future<void> clear() async => _refresh = null;
}

class _SessionAdapter implements HttpClientAdapter {
  int refreshCalls = 0;
  int exchangeCalls = 0;
  int hrmsCalls = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    Object body;
    if (options.path == ApiRoutes.refresh) {
      refreshCalls++;
      body = {
        'accessToken': 'platform-access',
        'refreshToken': 'rotated-refresh',
      };
    } else if (options.path == ApiRoutes.productToken) {
      exchangeCalls++;
      body = {'accessToken': 'hrms-product', 'expiresIn': 900};
    } else {
      hrmsCalls++;
      expect(options.headers['Authorization'], 'Bearer hrms-product');
      body = {'data': <String, dynamic>{}};
    }
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

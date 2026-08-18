import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/network/api_service.dart';
import 'package:hrms_attendance/core/network/authority_clients.dart';
import 'package:hrms_attendance/core/network/token_store.dart';
import 'package:hrms_attendance/features/attendance/data/attendance_api_repository.dart';

void main() {
  test(
    'monthly history uses the separated from/to pagination contract',
    () async {
      final adapter = _HistoryAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      final repository = AttendanceApiRepository(
        HrmsApiClient(
          ApiService(
            TokenStore(const FlutterSecureStorage()),
            dio: dio,
            initialHrmsProductToken: 'test-hrms-product-token',
          ),
        ),
      );

      final result = await repository.history(month: '2026-02');

      expect(adapter.path, '/api/hrms/v1/attendance/me/history');
      expect(adapter.query, {
        'from': '2026-02-01',
        'to': '2026-02-28',
        'limit': '31',
      });
      expect(result.month, '2026-02');
      expect(result.days, isEmpty);
    },
  );

  test(
    'monthly history rejects an invalid month before network access',
    () async {
      final adapter = _HistoryAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      final repository = AttendanceApiRepository(
        HrmsApiClient(
          ApiService(
            TokenStore(const FlutterSecureStorage()),
            dio: dio,
            initialHrmsProductToken: 'test-hrms-product-token',
          ),
        ),
      );

      await expectLater(
        repository.history(month: 'February 2026'),
        throwsA(isA<FormatException>()),
      );
      expect(adapter.path, isNull);
    },
  );
}

class _HistoryAdapter implements HttpClientAdapter {
  String? path;
  Map<String, String>? query;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    path = options.path;
    query = options.queryParameters.map(
      (key, value) => MapEntry(key, value.toString()),
    );
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

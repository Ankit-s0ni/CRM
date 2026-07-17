import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/network/api_availability.dart';
import 'package:hrms_attendance/core/network/api_availability_provider.dart';
import 'package:hrms_attendance/core/network/api_service.dart';
import 'package:hrms_attendance/core/network/network_providers.dart';
import 'package:hrms_attendance/core/network/token_store.dart';
import 'package:hrms_attendance/core/widgets/app_availability_gate.dart';

void main() {
  test('publishes offline when transport cannot connect', () async {
    final service = _service(
      _CallbackAdapter((options) {
        throw DioException(
          requestOptions: options,
          type: DioExceptionType.connectionError,
          message: 'offline',
        );
      }),
    );
    final event = service.availability.first;

    await expectLater(
      service.get<void>('/today'),
      throwsA(isA<DioException>()),
    );
    expect((await event).state, ApiAvailability.offline);
  });

  test('publishes provider unavailable from a coded API response', () async {
    final service = _service(
      _jsonError(
        503,
        'VERIFICATION_PROVIDER_UNAVAILABLE',
        'Verification is temporarily unavailable',
      ),
    );
    final event = service.availability.first;

    await expectLater(
      service.post<void>('/attendance/punches'),
      throwsA(isA<DioException>()),
    );
    expect((await event).state, ApiAvailability.providerUnavailable);
  });

  test(
    'publishes workspace unavailable from a suspended tenant response',
    () async {
      final service = _service(
        _jsonError(403, 'TENANT_SUSPENDED', 'Contact your workspace owner'),
      );
      final event = service.availability.first;

      await expectLater(
        service.get<void>('/attendance/today'),
        throwsA(isA<DioException>()),
      );
      final value = await event;
      expect(value.state, ApiAvailability.workspaceUnavailable);
      expect(value.code, 'TENANT_SUSPENDED');
    },
  );

  test('publishes session expired when a 401 cannot be refreshed', () async {
    final dio = Dio()
      ..httpClientAdapter = _jsonError(401, 'UNAUTHORIZED', 'Expired');
    final service = ApiService(_FakeTokenStore(), dio: dio, refreshDio: dio);
    final event = service.availability.first;

    await expectLater(
      service.get<void>('/attendance/today'),
      throwsA(isA<DioException>()),
    );
    expect((await event).state, ApiAvailability.sessionExpired);
  });

  const widgetStates = [
    (
      ApiAvailability.offline,
      'You are offline. Showing the last available information.',
    ),
    (
      ApiAvailability.providerUnavailable,
      'Verification is temporarily unavailable. Please retry.',
    ),
    (ApiAvailability.sessionExpired, 'Your session has expired'),
    (ApiAvailability.workspaceUnavailable, 'Workspace unavailable'),
  ];
  const deviceSizes = [Size(320, 568), Size(390, 844), Size(430, 932)];
  for (final state in widgetStates) {
    for (final size in deviceSizes) {
      testWidgets(
        'renders ${state.$1.name} at ${size.width.toInt()}x${size.height.toInt()}',
        (tester) async {
          await tester.binding.setSurfaceSize(size);
          addTearDown(() => tester.binding.setSurfaceSize(null));

          final service = _service(const _SuccessAdapter());
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                apiServiceProvider.overrideWithValue(service),
                apiAvailabilityProvider.overrideWith(
                  (ref) => Stream.value(ApiAvailabilityEvent(state.$1)),
                ),
              ],
              child: const MaterialApp(
                home: AppAvailabilityGate(
                  child: Scaffold(body: Text('Attendance home')),
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();

          expect(tester.takeException(), isNull);
          expect(find.text(state.$2), findsOneWidget);
          if (state.$1 == ApiAvailability.offline ||
              state.$1 == ApiAvailability.providerUnavailable) {
            expect(find.text('Attendance home'), findsOneWidget);
          } else {
            expect(find.text('Attendance home'), findsNothing);
          }
        },
      );
    }
  }
}

ApiService _service(HttpClientAdapter adapter) {
  final dio = Dio()..httpClientAdapter = adapter;
  return ApiService(
    TokenStore(const FlutterSecureStorage()),
    dio: dio,
    refreshDio: dio,
  );
}

HttpClientAdapter _jsonError(int status, String code, String message) =>
    _CallbackAdapter(
      (_) async => ResponseBody.fromString(
        jsonEncode({'code': code, 'message': message, 'details': {}}),
        status,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      ),
    );

typedef _AdapterCallback =
    Future<ResponseBody> Function(RequestOptions options);

class _CallbackAdapter implements HttpClientAdapter {
  const _CallbackAdapter(this.callback);
  final _AdapterCallback callback;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) => callback(options);

  @override
  void close({bool force = false}) {}
}

class _SuccessAdapter implements HttpClientAdapter {
  const _SuccessAdapter();

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString('{}', 200);

  @override
  void close({bool force = false}) {}
}

class _FakeTokenStore extends TokenStore {
  _FakeTokenStore() : super(const FlutterSecureStorage());

  @override
  Future<String?> readRefreshToken() async => null;

  @override
  Future<void> clear() async {}
}

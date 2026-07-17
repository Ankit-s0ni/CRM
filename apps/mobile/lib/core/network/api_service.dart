import 'dart:async';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../logging/app_logger.dart';
import 'api_availability.dart';
import 'api_routes.dart';
import 'token_store.dart';

class ApiService {
  ApiService(this._tokens, {Dio? dio, Dio? refreshDio})
    : _dio = dio ?? Dio(_options()),
      _refreshDio = refreshDio ?? Dio(_options()) {
    _dio.interceptors.add(
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) {
          if (_accessToken != null) {
            options.headers['Authorization'] = 'Bearer $_accessToken';
          }
          AppLogger.debug('${options.method} ${options.path}');
          handler.next(options);
        },
        onResponse: (response, handler) {
          _availability.add(const ApiAvailabilityEvent(ApiAvailability.online));
          handler.next(response);
        },
        onError: (error, handler) async {
          AppLogger.error('api_request_failed', error, error.stackTrace);
          _publishAvailability(error);
          if (error.response?.statusCode != 401 ||
              error.requestOptions.extra['retried'] == true ||
              error.requestOptions.path == ApiRoutes.refresh) {
            handler.next(error);
            return;
          }
          final token = await _refreshAccessToken();
          if (token == null) {
            _availability.add(
              const ApiAvailabilityEvent(ApiAvailability.sessionExpired),
            );
            handler.next(error);
            return;
          }
          final request = error.requestOptions;
          request.extra['retried'] = true;
          request.headers['Authorization'] = 'Bearer $token';
          try {
            handler.resolve(await _dio.fetch<dynamic>(request));
          } on DioException catch (retryError) {
            handler.next(retryError);
          }
        },
      ),
    );
  }

  final TokenStore _tokens;
  final Dio _dio;
  final Dio _refreshDio;
  final StreamController<ApiAvailabilityEvent> _availability =
      StreamController<ApiAvailabilityEvent>.broadcast(sync: true);
  String? _accessToken;
  Future<String?>? _refreshing;

  Stream<ApiAvailabilityEvent> get availability => _availability.stream;

  static BaseOptions _options() => BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: AppConfig.connectTimeout,
    receiveTimeout: AppConfig.receiveTimeout,
    headers: const {
      'Accept': 'application/json',
      'x-workspace-subdomain': AppConfig.workspaceSubdomain,
    },
  );

  void setAccessToken(String? token) {
    _accessToken = token;
    if (token == null) {
      _dio.options.headers.remove('Authorization');
    } else {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  Future<void> establishSession(Map<String, dynamic> session) async {
    final accessToken = session['accessToken'];
    final refreshToken = session['refreshToken'];
    if (accessToken is! String || refreshToken is! String) {
      throw const FormatException('The authentication response is invalid.');
    }
    setAccessToken(accessToken);
    await _tokens.writeRefreshToken(refreshToken);
  }

  Future<void> clearSession() async {
    setAccessToken(null);
    await _tokens.clear();
  }

  Future<String?> refreshToken() => _tokens.readRefreshToken();

  Future<void> putBytes(String url, List<int> bytes, String contentType) async {
    await Dio().put<void>(
      url,
      data: bytes,
      options: Options(
        headers: {'Content-Type': contentType, 'Content-Length': bytes.length},
      ),
    );
  }

  Future<String?> _refreshAccessToken() {
    return _refreshing ??= _performRefresh().whenComplete(
      () => _refreshing = null,
    );
  }

  Future<String?> _performRefresh() async {
    final refreshToken = await _tokens.readRefreshToken();
    if (refreshToken == null) return null;
    try {
      final response = await _refreshDio.post<Map<String, dynamic>>(
        ApiRoutes.refresh,
        data: {'refreshToken': refreshToken},
      );
      final session = response.data;
      if (session == null) return null;
      await establishSession(session);
      return _accessToken;
    } on DioException {
      await clearSession();
      return null;
    }
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) =>
      _dio.get<T>(path, queryParameters: query);
  Future<Response<T>> post<T>(String path, {Object? data}) =>
      _dio.post<T>(path, data: data);
  Future<Response<T>> patch<T>(String path, {Object? data}) =>
      _dio.patch<T>(path, data: data);
  Future<Response<T>> delete<T>(String path, {Object? data}) =>
      _dio.delete<T>(path, data: data);

  void _publishAvailability(DioException error) {
    final body = error.response?.data;
    final code = body is Map<String, dynamic> ? body['code'] as String? : null;
    final message = body is Map<String, dynamic>
        ? body['message'] as String?
        : null;
    if (const {
      'TENANT_SUSPENDED',
      'WORKSPACE_UNAVAILABLE',
      'WORKSPACE_NOT_FOUND',
      'SUBSCRIPTION_REQUIRED',
    }.contains(code)) {
      _availability.add(
        ApiAvailabilityEvent(
          ApiAvailability.workspaceUnavailable,
          code: code,
          message: message,
        ),
      );
      return;
    }
    if (code == 'VERIFICATION_PROVIDER_UNAVAILABLE') {
      _availability.add(
        ApiAvailabilityEvent(
          ApiAvailability.providerUnavailable,
          code: code,
          message: message,
        ),
      );
      return;
    }
    if (error.response == null ||
        const {
          DioExceptionType.connectionError,
          DioExceptionType.connectionTimeout,
          DioExceptionType.receiveTimeout,
          DioExceptionType.sendTimeout,
        }.contains(error.type)) {
      _availability.add(const ApiAvailabilityEvent(ApiAvailability.offline));
    }
  }
}

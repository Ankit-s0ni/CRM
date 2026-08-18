import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../device/device_identity.dart';
import '../logging/app_logger.dart';
import '../session/mobile_identity_scope.dart';
import '../utils/uuid.dart';
import 'api_availability.dart';
import 'api_routes.dart';
import 'token_store.dart';

/// Coordinates two independent authorities behind the public gateway.
/// Platform session credentials never enter the HRMS client and the short-lived
/// HRMS product token is kept in memory only.
class ApiService {
  ApiService(
    this._tokens, {
    Dio? dio,
    Dio? platformDio,
    Dio? hrmsDio,
    Dio? refreshDio,
    DeviceIdentity? deviceIdentity,
    String? initialHrmsProductToken,
  }) : _deviceIdentity = deviceIdentity,
       _platformDio = platformDio ?? dio ?? Dio(_options()),
       _hrmsDio = hrmsDio ?? _copyAdapterOrCreate(dio),
       _refreshDio = refreshDio ?? Dio(_options()),
       _hrmsProductToken = initialHrmsProductToken,
       _hrmsProductTokenExpiresAt = initialHrmsProductToken == null
           ? null
           : DateTime.now().add(const Duration(hours: 1)) {
    _installPlatformInterceptor();
    _installHrmsInterceptor();
  }

  final TokenStore _tokens;
  final DeviceIdentity? _deviceIdentity;
  final Dio _platformDio;
  final Dio _hrmsDio;
  final Dio _refreshDio;
  final StreamController<ApiAvailabilityEvent> _availability =
      StreamController<ApiAvailabilityEvent>.broadcast(sync: true);
  final StreamController<void> _sessionRefreshed =
      StreamController<void>.broadcast(sync: true);
  String? _platformAccessToken;
  String? _hrmsProductToken;
  DateTime? _hrmsProductTokenExpiresAt;
  String _workspaceSubdomain = AppConfig.workspaceSubdomain;
  Future<String?>? _refreshingPlatform;
  Future<String?>? _exchangingHrms;
  int _sessionGeneration = 0;

  Stream<ApiAvailabilityEvent> get availability => _availability.stream;
  Stream<void> get sessionRefreshed => _sessionRefreshed.stream;
  String get workspaceSubdomain => _workspaceSubdomain;

  static BaseOptions _options() => BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: AppConfig.connectTimeout,
    receiveTimeout: AppConfig.receiveTimeout,
    headers: {'Accept': 'application/json'},
  );

  static Dio _copyAdapterOrCreate(Dio? source) {
    final copy = Dio(_options());
    if (source != null) copy.httpClientAdapter = source.httpClientAdapter;
    return copy;
  }

  void _installPlatformInterceptor() {
    _platformDio.interceptors.add(
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) {
          if (_platformAccessToken != null) {
            options.headers['Authorization'] = 'Bearer $_platformAccessToken';
          }
          options.headers.putIfAbsent('x-request-id', newUuid);
          AppLogger.debug(
            '${options.method} ${options.path} authority=platform',
          );
          handler.next(options);
        },
        onResponse: (response, handler) {
          _online();
          handler.next(response);
        },
        onError: (error, handler) async {
          _publishAvailability(error);
          if (!_canRetry(error) ||
              _isPlatformAuthRoute(error.requestOptions.path)) {
            handler.next(error);
            return;
          }
          final token = await _refreshPlatformAccessToken();
          if (token == null) {
            _availability.add(
              const ApiAvailabilityEvent(ApiAvailability.sessionExpired),
            );
            handler.next(error);
            return;
          }
          await _retry(_platformDio, error, handler, token);
        },
      ),
    );
  }

  void _installHrmsInterceptor() {
    _hrmsDio.interceptors.add(
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _validHrmsProductToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          options.headers.putIfAbsent('x-request-id', newUuid);
          AppLogger.debug('${options.method} ${options.path} authority=hrms');
          handler.next(options);
        },
        onResponse: (response, handler) {
          _online();
          handler.next(response);
        },
        onError: (error, handler) async {
          _publishAvailability(error);
          if (!_canRetry(error) || !_isProductTokenFailure(error)) {
            handler.next(error);
            return;
          }
          _clearHrmsToken();
          final token = await _exchangeHrmsProductToken();
          if (token == null) {
            handler.next(error);
            return;
          }
          await _retry(_hrmsDio, error, handler, token);
        },
      ),
    );
  }

  Future<void> selectWorkspace(String value) async {
    final workspace = value.trim().toLowerCase();
    if (!RegExp(
      r'^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$',
    ).hasMatch(workspace)) {
      throw const FormatException('Enter a valid workspace code.');
    }
    _workspaceSubdomain = workspace;
    for (final dio in [_platformDio, _hrmsDio, _refreshDio]) {
      dio.options.headers['x-workspace-subdomain'] = workspace;
    }
    await _tokens.writeWorkspaceSubdomain(workspace);
  }

  Future<void> restoreWorkspace() async {
    final stored = await _tokens.readWorkspaceSubdomain();
    await selectWorkspace(stored ?? AppConfig.workspaceSubdomain);
  }

  void beginWorkspaceDiscovery() {
    _sessionGeneration++;
    _setPlatformAccessToken(null);
    _clearHrmsToken();
    for (final dio in [_platformDio, _hrmsDio, _refreshDio]) {
      dio.options.headers.remove('x-workspace-subdomain');
    }
  }

  /// Retained for test injection; application code establishes Platform
  /// sessions through [establishSession].
  void setAccessToken(String? token) => _setPlatformAccessToken(token);

  void _setPlatformAccessToken(String? token) {
    _platformAccessToken = token;
    if (token == null) {
      _platformDio.options.headers.remove('Authorization');
    } else {
      _platformDio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  Future<void> establishSession(Map<String, dynamic> session) async {
    final accessToken = session['accessToken'];
    final refreshToken = session['refreshToken'];
    if (accessToken is! String || refreshToken is! String) {
      throw const FormatException('The authentication response is invalid.');
    }
    _setPlatformAccessToken(accessToken);
    await _tokens.writeRefreshToken(refreshToken);
    await _exchangeHrmsProductToken();
  }

  /// Required bootstrap for every headless isolate before product work.
  Future<bool> bootstrapBackgroundSession() async {
    await restoreWorkspace();
    if (await _tokens.readIdentityScope() == null) return false;
    if (await _refreshPlatformAccessToken() == null) return false;
    return await _exchangeHrmsProductToken() != null;
  }

  Future<MobileIdentityScope?> identityScope() => _tokens.readIdentityScope();

  Future<void> bindEmployeeScope({
    required String employeeId,
    required String contractVersion,
  }) async {
    final token = _hrmsProductToken;
    final identity = await _deviceIdentity?.payload();
    if (token == null || identity == null) {
      throw StateError('An authenticated HRMS session is required.');
    }
    final claims = _decodeJwtClaims(token);
    await _tokens.writeIdentityScope(
      MobileIdentityScope(
        tenantId: claims['tenantId'] as String? ?? '',
        userId: claims['userId'] as String? ?? claims['sub'] as String? ?? '',
        membershipId: claims['membershipId'] as String? ?? '',
        employeeId: employeeId,
        deviceUuid: identity['deviceUuid'] ?? '',
        contractVersion: contractVersion,
      ),
    );
  }

  Future<void> clearSession({bool resetAvailability = true}) async {
    _sessionGeneration++;
    _setPlatformAccessToken(null);
    _clearHrmsToken();
    _workspaceSubdomain = AppConfig.workspaceSubdomain;
    for (final dio in [_platformDio, _hrmsDio, _refreshDio]) {
      dio.options.headers.remove('x-workspace-subdomain');
    }
    await _tokens.clear();
    if (resetAvailability) _online();
  }

  Future<String?> refreshToken() => _tokens.readRefreshToken();
  Future<bool> refreshSession() async =>
      await _refreshPlatformAccessToken() != null &&
      await _exchangeHrmsProductToken() != null;

  Future<void> putBytes(String url, List<int> bytes, String contentType) async {
    await Dio().put<void>(
      url,
      data: bytes,
      options: Options(
        headers: {'Content-Type': contentType, 'Content-Length': bytes.length},
      ),
    );
  }

  Future<String?> _refreshPlatformAccessToken() {
    return _refreshingPlatform ??= _performPlatformRefresh().whenComplete(
      () => _refreshingPlatform = null,
    );
  }

  Future<String?> _performPlatformRefresh() async {
    final generation = _sessionGeneration;
    final refreshToken = await _tokens.readRefreshToken();
    if (refreshToken == null) return null;
    try {
      final deviceUuid = (await _deviceIdentity?.payload())?['deviceUuid'];
      final response = await _refreshDio.post<Map<String, dynamic>>(
        ApiRoutes.refresh,
        data: {'refreshToken': refreshToken, 'deviceUuid': ?deviceUuid},
        options: Options(headers: {'x-request-id': newUuid()}),
      );
      final session = response.data;
      if (session == null || generation != _sessionGeneration) return null;
      final accessToken = session['accessToken'];
      final rotatedRefresh = session['refreshToken'];
      if (accessToken is! String || rotatedRefresh is! String) return null;
      _setPlatformAccessToken(accessToken);
      _clearHrmsToken();
      await _tokens.writeRefreshToken(rotatedRefresh);
      _sessionRefreshed.add(null);
      return accessToken;
    } on DioException {
      await clearSession(resetAvailability: false);
      return null;
    }
  }

  Future<String?> _validHrmsProductToken() async {
    if (_hrmsProductToken != null &&
        _hrmsProductTokenExpiresAt != null &&
        DateTime.now().isBefore(
          _hrmsProductTokenExpiresAt!.subtract(const Duration(seconds: 30)),
        )) {
      return _hrmsProductToken;
    }
    return _exchangeHrmsProductToken();
  }

  Future<String?> _exchangeHrmsProductToken() {
    return _exchangingHrms ??= _performHrmsExchange().whenComplete(
      () => _exchangingHrms = null,
    );
  }

  Future<String?> _performHrmsExchange() async {
    if (_platformAccessToken == null &&
        await _refreshPlatformAccessToken() == null) {
      return null;
    }
    final generation = _sessionGeneration;
    try {
      final response = await _platformDio.post<Map<String, dynamic>>(
        ApiRoutes.productToken,
        data: const {'audience': 'hrms-api'},
        options: Options(headers: {'x-request-id': newUuid()}),
      );
      if (generation != _sessionGeneration) return null;
      final body = response.data;
      final token = body?['accessToken'];
      final expiresIn = body?['expiresIn'];
      if (token is! String || expiresIn is! num) {
        throw const FormatException('The HRMS token response is invalid.');
      }
      _hrmsProductToken = token;
      _hrmsProductTokenExpiresAt = DateTime.now().add(
        Duration(seconds: expiresIn.toInt()),
      );
      return token;
    } on DioException catch (error) {
      _publishAvailability(error);
      return null;
    }
  }

  void _clearHrmsToken() {
    _hrmsProductToken = null;
    _hrmsProductTokenExpiresAt = null;
    _hrmsDio.options.headers.remove('Authorization');
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? query,
    Map<String, dynamic>? headers,
  }) => _client(path).get<T>(
    path,
    queryParameters: query,
    options: headers == null ? null : Options(headers: headers),
  );

  Future<Response<T>> post<T>(String path, {Object? data}) =>
      _client(path).post<T>(path, data: data);
  Future<Response<T>> patch<T>(String path, {Object? data}) =>
      _client(path).patch<T>(path, data: data);
  Future<Response<T>> delete<T>(String path, {Object? data}) =>
      _client(path).delete<T>(path, data: data);

  Dio _client(String path) =>
      path.startsWith('/api/hrms/v1/') ? _hrmsDio : _platformDio;

  bool _canRetry(DioException error) =>
      error.response?.statusCode == 401 &&
      error.requestOptions.extra['retried'] != true;

  bool _isPlatformAuthRoute(String path) =>
      path == ApiRoutes.refresh ||
      path == ApiRoutes.login ||
      path == ApiRoutes.mobileLogin;

  bool _isProductTokenFailure(DioException error) {
    final data = error.response?.data;
    final code = data is Map<String, dynamic> ? data['code'] : null;
    return code == null ||
        const {
          'PRODUCT_TOKEN_REQUIRED',
          'PRODUCT_TOKEN_INVALID',
          'PRODUCT_TOKEN_EXPIRED',
          'STALE_PRODUCT_TOKEN',
        }.contains(code);
  }

  Future<void> _retry<T>(
    Dio dio,
    DioException error,
    ErrorInterceptorHandler handler,
    String token,
  ) async {
    final request = error.requestOptions;
    request.extra['retried'] = true;
    request.headers['Authorization'] = 'Bearer $token';
    try {
      handler.resolve(await dio.fetch<dynamic>(request));
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  void _online() =>
      _availability.add(const ApiAvailabilityEvent(ApiAvailability.online));

  void _publishAvailability(DioException error) {
    AppLogger.error('api_request_failed', error, error.stackTrace);
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
      'PRODUCT_NOT_ENTITLED',
      'DEVICE_NOT_ACTIVE',
      'DEVICE_BLOCKED',
      'DEVICE_REPLACED',
      'MEMBERSHIP_INACTIVE',
      'IDENTITY_INACTIVE',
    }.contains(code)) {
      _clearHrmsToken();
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

Map<String, dynamic> _decodeJwtClaims(String token) {
  final parts = token.split('.');
  if (parts.length != 3) throw const FormatException('Invalid product token.');
  try {
    return Map<String, dynamic>.from(
      jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))))
          as Map,
    );
  } catch (_) {
    throw const FormatException('Invalid product token claims.');
  }
}

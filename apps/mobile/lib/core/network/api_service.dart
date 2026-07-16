import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../logging/app_logger.dart';

class ApiService {
  ApiService({Dio? dio}) : _dio = dio ?? Dio(_options()) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          AppLogger.debug('${options.method} ${options.path}');
          handler.next(options);
        },
        onError: (error, handler) {
          AppLogger.error('api_request_failed', error, error.stackTrace);
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;

  static BaseOptions _options() => BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: AppConfig.connectTimeout,
    receiveTimeout: AppConfig.receiveTimeout,
    headers: const {'Accept': 'application/json'},
  );

  void setAccessToken(String? token) {
    if (token == null) {
      _dio.options.headers.remove('Authorization');
    } else {
      _dio.options.headers['Authorization'] = 'Bearer $token';
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
}

import 'package:dio/dio.dart';

import 'api_service.dart';

/// Platform-only network edge. Product routes are rejected before transport.
class PlatformApiClient {
  const PlatformApiClient(ApiService session) : _session = session;
  final ApiService _session;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? query,
    Map<String, dynamic>? headers,
  }) {
    _assertPlatform(path);
    return _session.get<T>(path, query: query, headers: headers);
  }

  Future<Response<T>> post<T>(String path, {Object? data}) {
    _assertPlatform(path);
    return _session.post<T>(path, data: data);
  }

  Future<Response<T>> patch<T>(String path, {Object? data}) {
    _assertPlatform(path);
    return _session.patch<T>(path, data: data);
  }

  Future<Response<T>> delete<T>(String path, {Object? data}) {
    _assertPlatform(path);
    return _session.delete<T>(path, data: data);
  }

  void _assertPlatform(String path) {
    if (path.startsWith('/api/hrms/v1/')) {
      throw ArgumentError.value(path, 'path', 'HRMS route on Platform client');
    }
  }
}

/// HRMS-only network edge. Every call is guaranteed to use the product token.
class HrmsApiClient {
  const HrmsApiClient(ApiService session) : _session = session;
  final ApiService _session;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? query,
    Map<String, dynamic>? headers,
  }) {
    _assertHrms(path);
    return _session.get<T>(path, query: query, headers: headers);
  }

  Future<Response<T>> post<T>(String path, {Object? data}) {
    _assertHrms(path);
    return _session.post<T>(path, data: data);
  }

  Future<Response<T>> patch<T>(String path, {Object? data}) {
    _assertHrms(path);
    return _session.patch<T>(path, data: data);
  }

  Future<Response<T>> delete<T>(String path, {Object? data}) {
    _assertHrms(path);
    return _session.delete<T>(path, data: data);
  }

  Future<void> putBytes(String url, List<int> bytes, String contentType) =>
      _session.putBytes(url, bytes, contentType);

  void _assertHrms(String path) {
    if (!path.startsWith('/api/hrms/v1/')) {
      throw ArgumentError.value(path, 'path', 'Platform route on HRMS client');
    }
  }
}

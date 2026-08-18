import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../session/mobile_identity_scope.dart';

class TokenStore {
  TokenStore(this._storage);
  final FlutterSecureStorage _storage;
  static const _refreshKey = 'refresh_token';
  static const _workspaceKey = 'workspace_subdomain';
  static const _identityScopeKey = 'mobile_identity_scope_v1';

  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);
  Future<void> writeRefreshToken(String value) =>
      _storage.write(key: _refreshKey, value: value);
  Future<String?> readWorkspaceSubdomain() => _storage.read(key: _workspaceKey);
  Future<void> writeWorkspaceSubdomain(String value) =>
      _storage.write(key: _workspaceKey, value: value);
  Future<MobileIdentityScope?> readIdentityScope() async {
    final value = await _storage.read(key: _identityScopeKey);
    if (value == null) return null;
    try {
      final scope = MobileIdentityScope.fromJson(
        jsonDecode(value) as Map<String, dynamic>,
      );
      return scope.isComplete ? scope : null;
    } catch (_) {
      await _storage.delete(key: _identityScopeKey);
      return null;
    }
  }

  Future<void> writeIdentityScope(MobileIdentityScope scope) {
    if (!scope.isComplete) {
      throw const FormatException('Mobile identity scope is incomplete.');
    }
    return _storage.write(
      key: _identityScopeKey,
      value: jsonEncode(scope.toJson()),
    );
  }

  Future<void> clear() async {
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _workspaceKey);
    await _storage.delete(key: _identityScopeKey);
  }
}

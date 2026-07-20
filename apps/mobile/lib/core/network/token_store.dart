import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  TokenStore(this._storage);
  final FlutterSecureStorage _storage;
  static const _refreshKey = 'refresh_token';
  static const _workspaceKey = 'workspace_subdomain';

  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);
  Future<void> writeRefreshToken(String value) =>
      _storage.write(key: _refreshKey, value: value);
  Future<String?> readWorkspaceSubdomain() => _storage.read(key: _workspaceKey);
  Future<void> writeWorkspaceSubdomain(String value) =>
      _storage.write(key: _workspaceKey, value: value);
  Future<void> clear() async {
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _workspaceKey);
  }
}

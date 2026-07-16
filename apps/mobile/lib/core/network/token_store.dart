import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  TokenStore(this._storage);
  final FlutterSecureStorage _storage;
  static const _refreshKey = 'refresh_token';

  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);
  Future<void> writeRefreshToken(String value) =>
      _storage.write(key: _refreshKey, value: value);
  Future<void> clear() => _storage.delete(key: _refreshKey);
}

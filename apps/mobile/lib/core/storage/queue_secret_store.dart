import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class QueueSecretStore {
  const QueueSecretStore(this._storage);

  final FlutterSecureStorage _storage;

  Future<void> writeIntegrityToken(
    String ownerKey,
    String eventId,
    String token,
  ) => _storage.write(key: _key(ownerKey, eventId), value: token);

  Future<String?> readIntegrityToken(String ownerKey, String eventId) =>
      _storage.read(key: _key(ownerKey, eventId));

  Future<void> deleteIntegrityToken(String ownerKey, String eventId) =>
      _storage.delete(key: _key(ownerKey, eventId));

  String _key(String ownerKey, String eventId) =>
      'offline_integrity_v2_${ownerKey.hashCode}_$eventId';
}

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class QueueSecretStore {
  const QueueSecretStore(this._storage);

  final FlutterSecureStorage _storage;

  Future<void> writeIntegrityToken(String eventId, String token) =>
      _storage.write(key: _key(eventId), value: token);

  Future<String?> readIntegrityToken(String eventId) =>
      _storage.read(key: _key(eventId));

  Future<void> deleteIntegrityToken(String eventId) =>
      _storage.delete(key: _key(eventId));

  String _key(String eventId) => 'offline_integrity_$eventId';
}

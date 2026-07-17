import 'dart:math';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final deviceIdentityProvider = Provider<DeviceIdentity>(
  (ref) => DeviceIdentity(const FlutterSecureStorage()),
);

class DeviceIdentity {
  DeviceIdentity(this._storage, [DeviceInfoPlugin? deviceInfo])
    : _deviceInfo = deviceInfo ?? DeviceInfoPlugin();

  final FlutterSecureStorage _storage;
  final DeviceInfoPlugin _deviceInfo;
  static const _installationKey = 'installation_id';

  Future<Map<String, String>> payload() async {
    final installationId = await _installationId();
    if (kIsWeb) {
      final info = await _deviceInfo.webBrowserInfo;
      return {
        'deviceUuid': installationId,
        'platform': 'WEB',
        'deviceModel': info.browserName.name,
        'osVersion': info.platform ?? 'browser',
        'appVersion': '1.0.0',
      };
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        final info = await _deviceInfo.androidInfo;
        return {
          'deviceUuid': installationId,
          'platform': 'ANDROID',
          'deviceModel': info.model,
          'osVersion': info.version.release,
          'appVersion': '1.0.0',
        };
      case TargetPlatform.iOS:
        final info = await _deviceInfo.iosInfo;
        return {
          'deviceUuid': installationId,
          'platform': 'IOS',
          'deviceModel': info.utsname.machine,
          'osVersion': info.systemVersion,
          'appVersion': '1.0.0',
        };
      default:
        return {
          'deviceUuid': installationId,
          'platform': defaultTargetPlatform.name.toUpperCase(),
          'deviceModel': 'Desktop',
          'osVersion': 'unknown',
          'appVersion': '1.0.0',
        };
    }
  }

  Future<String> _installationId() async {
    final existing = await _storage.read(key: _installationKey);
    if (existing != null && existing.isNotEmpty) return existing;
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();
    final value =
        '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-'
        '${hex.substring(20)}';
    await _storage.write(key: _installationKey, value: value);
    return value;
  }
}

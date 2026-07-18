import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../config/app_config.dart';
import '../network/api_routes.dart';
import '../network/api_service.dart';

class IntegrityTokenProvider {
  IntegrityTokenProvider(this._api, {IntegrityNativeClient? native})
    : _native = native ?? const IntegrityNativeClient();

  final ApiService _api;
  final IntegrityNativeClient _native;

  Future<IntegrityEvidence> evidence(
    String deviceUuid, {
    bool offline = false,
  }) async {
    if (!kReleaseMode) {
      // Debug tokens are accepted only by non-production API environments.
      final issuedAt = DateTime.now().toUtc();
      return IntegrityEvidence(
        token: 'dev-integrity-ok',
        issuedAt: issuedAt,
        expiresAt: issuedAt.add(const Duration(hours: 48)),
      );
    }
    try {
      final response = await _api.post<Map<String, dynamic>>(
        ApiRoutes.integrityChallenge,
        data: {
          'deviceUuid': deviceUuid,
          'action': offline ? 'OFFLINE_PUNCH' : 'PUNCH',
        },
      );
      final challenge = response.data?['data'] as Map<String, dynamic>?;
      final challengeId = challenge?['id'] as String?;
      final nonce = challenge?['nonce'] as String?;
      final platform = challenge?['platform'] as String?;
      final expiresAt = DateTime.tryParse(
        challenge?['expiresAt'] as String? ?? '',
      );
      if (challengeId == null ||
          nonce == null ||
          expiresAt == null ||
          (platform != 'ANDROID' && platform != 'IOS')) {
        throw const FormatException('Invalid integrity challenge');
      }
      final native = await _native.generate(
        nonce: nonce,
        cloudProjectNumber: AppConfig.playIntegrityCloudProjectNumber,
      );
      final evidence = native['evidence'] as String?;
      final mode = native['mode'] as String?;
      if (evidence == null || evidence.length < 8 || mode == null) {
        throw const FormatException('Invalid native integrity evidence');
      }
      return IntegrityEvidence(
        token: jsonEncode({
          'challengeId': challengeId,
          'platform': platform,
          'evidence': evidence,
          'mode': mode,
          if (native['keyId'] is String) 'keyId': native['keyId'],
        }),
        issuedAt: DateTime.now().toUtc(),
        expiresAt: expiresAt.toUtc(),
      );
    } catch (error) {
      throw IntegrityProviderUnavailable(error);
    }
  }

  Future<String> token(String deviceUuid) async =>
      (await evidence(deviceUuid)).token;
}

class IntegrityNativeClient {
  const IntegrityNativeClient();

  static const _channel = MethodChannel('hrms/integrity');

  Future<Map<String, dynamic>> generate({
    required String nonce,
    required String cloudProjectNumber,
  }) async {
    final response = await _channel.invokeMapMethod<String, dynamic>(
      'generateEvidence',
      {'nonce': nonce, 'cloudProjectNumber': cloudProjectNumber},
    );
    if (response == null) throw PlatformException(code: 'NO_EVIDENCE');
    return response;
  }
}

class IntegrityEvidence {
  const IntegrityEvidence({
    required this.token,
    required this.issuedAt,
    required this.expiresAt,
  });

  final String token;
  final DateTime issuedAt;
  final DateTime expiresAt;
}

class IntegrityProviderUnavailable implements Exception {
  const IntegrityProviderUnavailable([this.cause]);
  final Object? cause;
}

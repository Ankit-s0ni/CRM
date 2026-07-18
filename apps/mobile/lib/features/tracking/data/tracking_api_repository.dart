import 'dart:convert';

import 'package:dio/dio.dart';

import '../../../core/logging/app_logger.dart';
import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../../../core/storage/mobile_queue_models.dart';
import '../../../core/storage/mobile_queue_repository.dart';
import '../../../core/utils/uuid.dart';
import '../domain/tracking_repository.dart';

class TrackingApiRepository implements TrackingRepository {
  TrackingApiRepository(this._api, this._queue);

  final ApiService _api;
  final MobileQueueRepository _queue;

  @override
  Future<FieldTrackingSession?> active(String deviceUuid) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        ApiRoutes.fieldSessionActive,
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) {
        await _queue.stopSession();
        return null;
      }
      return _persistSession(data, deviceUuid);
    } on DioException catch (error) {
      if (error.response != null) rethrow;
      final local = await _queue.activeSession();
      if (local == null) return null;
      AppLogger.warning('field_session_restored_offline');
      return FieldTrackingSession(
        id: local.serverSessionId,
        deviceUuid: local.deviceUuid,
        clientStartUuid: local.clientStartUuid,
        startedAt: local.startedAt,
        lastPingAt: local.lastPingAt,
      );
    }
  }

  @override
  Future<FieldTrackingSession> start({
    required String deviceUuid,
    required String clientStartUuid,
  }) async {
    final response = await _api.post<Map<String, dynamic>>(
      ApiRoutes.fieldSessionStart,
      data: {'deviceUuid': deviceUuid, 'clientStartUuid': clientStartUuid},
    );
    final data = response.data?['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw const FormatException('Invalid field session response');
    }
    final session = await _persistSession(data, deviceUuid);
    AppLogger.info('field_tracking_started session=${session.id}');
    return session;
  }

  @override
  Future<void> stop(String sessionId, {required String reason}) async {
    await _api.post<void>(
      ApiRoutes.fieldSessionStop(sessionId),
      data: {'endReason': reason},
    );
    await _queue.stopSession();
    AppLogger.info('field_tracking_stopped reason=$reason');
  }

  @override
  Future<void> queuePing(String deviceUuid, FieldPingCapture capture) async {
    final clientPingUuid = newUuid();
    final item = {
      'clientPingUuid': clientPingUuid,
      'sessionId': capture.sessionId,
      'latitude': capture.latitude,
      'longitude': capture.longitude,
      'accuracyM': capture.accuracyM,
      'speedMps': ?capture.speedMps,
      'batteryLevel': ?capture.batteryLevel,
      'isMock': capture.isMock,
      'capturedAt': capture.capturedAt.toUtc().toIso8601String(),
      'isOfflineSync': false,
    };
    final batch = PendingFieldPingBatch()
      ..batchUuid = newUuid()
      ..sessionId = capture.sessionId
      ..deviceUuid = deviceUuid
      ..itemsJson = jsonEncode([item])
      ..createdAt = DateTime.now().toUtc()
      ..nextAttemptAt = DateTime.now().toUtc();
    await _queue.savePingBatch(batch);
    final local = await _queue.activeSession();
    if (local != null) {
      local
        ..lastPingAt = capture.capturedAt
        ..capturedPingCount += 1;
      await _queue.saveSession(local);
    }
    AppLogger.debug('field_ping_queued id=$clientPingUuid');
  }

  @override
  Future<void> flushPending() async {
    final batches = await _queue.duePingBatches();
    for (final batch in batches) {
      try {
        final items = (jsonDecode(batch.itemsJson) as List<dynamic>)
            .whereType<Map<String, dynamic>>()
            .map((item) {
              final capturedAt = DateTime.parse(item['capturedAt'] as String);
              return {
                ...item,
                'isOfflineSync':
                    DateTime.now().difference(capturedAt) >
                    const Duration(minutes: 2),
              };
            })
            .toList(growable: false);
        final response = await _api.post<Map<String, dynamic>>(
          ApiRoutes.fieldPingsBatch,
          data: {'deviceUuid': batch.deviceUuid, 'items': items},
        );
        final outcomes = (response.data?['data'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .toList(growable: false);
        if (outcomes.any((outcome) => outcome['status'] == 'REJECTED')) {
          batch
            ..status = 'REJECTED'
            ..errorCode =
                outcomes.firstWhere(
                      (outcome) => outcome['status'] == 'REJECTED',
                    )['code']
                    as String?;
          await _queue.savePingBatch(batch);
        } else {
          await _queue.deletePingBatch(batch.id);
        }
      } on DioException catch (error, stack) {
        final retryable =
            error.response == null ||
            (error.response?.statusCode ?? 500) >= 500 ||
            error.response?.statusCode == 429;
        if (!retryable) {
          batch
            ..status = 'REJECTED'
            ..errorCode = _apiCode(error) ?? 'PING_REJECTED';
        } else {
          batch
            ..status = 'RETRYABLE'
            ..attempts += 1
            ..errorCode = _apiCode(error) ?? 'SYNC_DEPENDENCY_UNAVAILABLE'
            ..nextAttemptAt = DateTime.now().add(queueBackoff(batch.attempts));
        }
        await _queue.savePingBatch(batch);
        AppLogger.warning(
          'field_ping_flush_failed retryable=$retryable',
          error,
          stack,
        );
      }
    }
  }

  Future<FieldTrackingSession> _persistSession(
    Map<String, dynamic> data,
    String deviceUuid,
  ) async {
    final session = FieldTrackingSession(
      id: data['id'] as String,
      deviceUuid: deviceUuid,
      clientStartUuid: data['clientStartUuid'] as String,
      startedAt: DateTime.parse(data['startedAt'] as String),
      lastPingAt: data['lastPingAt'] == null
          ? null
          : DateTime.parse(data['lastPingAt'] as String),
    );
    final previous = await _queue.activeSession();
    await _queue.saveSession(
      LocalFieldSession()
        ..serverSessionId = session.id
        ..clientStartUuid = session.clientStartUuid
        ..deviceUuid = deviceUuid
        ..startedAt = session.startedAt
        ..lastPingAt = session.lastPingAt
        ..capturedPingCount = previous?.capturedPingCount ?? 0,
    );
    return session;
  }
}

String? _apiCode(DioException error) {
  final body = error.response?.data;
  return body is Map<String, dynamic> ? body['code'] as String? : null;
}

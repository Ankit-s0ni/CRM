import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';

import '../../../core/logging/app_logger.dart';
import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../../../core/storage/mobile_queue_models.dart';
import '../../../core/storage/mobile_queue_repository.dart';
import '../../../core/storage/queue_secret_store.dart';
import '../domain/sync_repository.dart';

class SyncApiRepository implements SyncRepository {
  SyncApiRepository(this._api, this._queue, this._secrets);

  final ApiService _api;
  final MobileQueueRepository _queue;
  final QueueSecretStore _secrets;

  @override
  Future<List<SyncQueueItem>> items() async =>
      (await _queue.attendanceRecords()).map(_toItem).toList(growable: false);

  @override
  Stream<List<SyncQueueItem>> watchItems() => _queue.watchAttendance().map(
    (records) => records.map(_toItem).toList(growable: false),
  );

  @override
  Future<void> replayPending({
    String? clientEventUuid,
    bool force = false,
  }) async {
    final candidates = force
        ? (await _queue.attendanceRecords())
              .where(
                (record) =>
                    record.status == 'PENDING' || record.status == 'RETRYABLE',
              )
              .toList()
        : await _queue.dueAttendance();
    candidates.sort((left, right) => left.createdAt.compareTo(right.createdAt));
    final records = candidates
        .where(
          (record) =>
              clientEventUuid == null ||
              record.clientEventUuid == clientEventUuid,
        )
        .toList(growable: false);
    if (records.isEmpty) return;
    AppLogger.info('offline_sync_started count=${records.length}');
    final prepared = <PendingAttendanceRecord>[];
    final payloads = <Map<String, dynamic>>[];
    for (final record in records) {
      final payload = jsonDecode(record.payloadJson) as Map<String, dynamic>;
      final token = await _secrets.readIntegrityToken(record.clientEventUuid);
      if (token == null) {
        await _reject(record, 'OFFLINE_INTEGRITY_MISSING');
        continue;
      }
      try {
        final selfieKey = await _uploadEvidence(record);
        payloads.add({
          ...payload,
          'attestationToken': token,
          'selfieKey': ?selfieKey,
        });
        prepared.add(record);
      } catch (error, stack) {
        AppLogger.warning('offline_evidence_upload_retryable', error, stack);
        await _retry(record, 'SYNC_DEPENDENCY_UNAVAILABLE');
      }
    }
    if (payloads.isEmpty) return;
    try {
      final response = await _api.post<Map<String, dynamic>>(
        ApiRoutes.attendanceSync,
        data: {'items': payloads},
      );
      final outcomes = (response.data?['data'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .toList(growable: false);
      final byId = {
        for (final outcome in outcomes)
          if (outcome['clientEventUuid'] is String)
            outcome['clientEventUuid'] as String: outcome,
      };
      for (final record in prepared) {
        final outcome = byId[record.clientEventUuid];
        if (outcome == null) {
          await _retry(record, 'SYNC_RESPONSE_INCOMPLETE');
          continue;
        }
        await _applyOutcome(record, outcome);
      }
      AppLogger.info('offline_sync_finished count=${prepared.length}');
    } on DioException catch (error, stack) {
      AppLogger.warning('offline_sync_transport_retryable', error, stack);
      for (final record in prepared) {
        await _retry(record, 'SYNC_DEPENDENCY_UNAVAILABLE');
      }
      if (force) rethrow;
    }
  }

  Future<String?> _uploadEvidence(PendingAttendanceRecord record) async {
    final path = record.evidencePath;
    if (path == null) return null;
    final file = File(path);
    if (!await file.exists()) {
      throw const FileSystemException('Evidence missing');
    }
    final bytes = await file.readAsBytes();
    final response = await _api.post<Map<String, dynamic>>(
      ApiRoutes.punchEvidencePresign,
      data: {
        'filename': 'offline-attendance.jpg',
        'contentType': 'image/jpeg',
        'fileSize': bytes.length,
      },
    );
    final upload = response.data?['data'] as Map<String, dynamic>?;
    final key = upload?['objectKey'] as String?;
    final url = upload?['uploadUrl'] as String?;
    if (key == null || url == null) {
      throw const FormatException('Invalid upload contract');
    }
    await _api.putBytes(url, bytes, 'image/jpeg');
    return key;
  }

  Future<void> _applyOutcome(
    PendingAttendanceRecord record,
    Map<String, dynamic> outcome,
  ) async {
    final status = outcome['status'] as String? ?? 'RETRYABLE';
    record.errorCode = outcome['code'] as String?;
    record.regularizationSuggested =
        outcome['regularizationSuggested'] as bool? ?? false;
    if (status == 'ACCEPTED' || status == 'DUPLICATE') {
      record.status = 'SYNCED';
      record.syncedAt = DateTime.now().toUtc();
      await _secrets.deleteIntegrityToken(record.clientEventUuid);
      final path = record.evidencePath;
      if (path != null) await _deleteIfPresent(path);
      record.evidencePath = null;
      await _queue.saveAttendance(record);
      return;
    }
    if (status == 'RETRYABLE') {
      await _retry(record, record.errorCode ?? 'SYNC_RETRYABLE');
      return;
    }
    await _reject(record, record.errorCode ?? 'SYNC_REJECTED');
  }

  Future<void> _retry(PendingAttendanceRecord record, String code) async {
    record
      ..status = 'RETRYABLE'
      ..attempts += 1
      ..errorCode = code
      ..nextAttemptAt = DateTime.now().add(queueBackoff(record.attempts));
    await _queue.saveAttendance(record);
  }

  Future<void> _reject(PendingAttendanceRecord record, String code) async {
    record
      ..status = 'REJECTED'
      ..attempts += 1
      ..errorCode = code;
    await _secrets.deleteIntegrityToken(record.clientEventUuid);
    final path = record.evidencePath;
    if (path != null) await _deleteIfPresent(path);
    record.evidencePath = null;
    await _queue.saveAttendance(record);
  }
}

SyncQueueItem _toItem(PendingAttendanceRecord record) => SyncQueueItem(
  clientEventUuid: record.clientEventUuid,
  eventType: record.eventType,
  status: record.status,
  createdAt: record.createdAt,
  attempts: record.attempts,
  errorCode: record.errorCode,
  regularizationSuggested: record.regularizationSuggested,
);

Future<void> _deleteIfPresent(String path) async {
  try {
    await File(path).delete();
  } on FileSystemException {
    // The OS or a previous replay may already have removed the temporary file.
  }
}

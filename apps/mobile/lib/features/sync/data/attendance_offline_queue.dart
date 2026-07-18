import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../../../core/media/evidence_image_processor.dart';
import '../../../core/security/integrity_token_provider.dart';
import '../../../core/storage/mobile_queue_models.dart';
import '../../../core/storage/mobile_queue_repository.dart';
import '../../../core/storage/queue_secret_store.dart';
import '../../../core/utils/uuid.dart';

class AttendanceOfflineQueue {
  AttendanceOfflineQueue(
    this._queue,
    this._secrets, {
    EvidenceImageProcessor? imageProcessor,
  }) : _imageProcessor = imageProcessor ?? EvidenceImageProcessor();

  final MobileQueueRepository _queue;
  final QueueSecretStore _secrets;
  final EvidenceImageProcessor _imageProcessor;

  Future<String> enqueue({
    required String type,
    required Map<String, String> device,
    required IntegrityEvidence integrity,
    required DateTime clientTime,
    required int clientClockOffsetSeconds,
    double? latitude,
    double? longitude,
    int? accuracyMeters,
    bool? mockLocation,
    String? evidenceSourcePath,
  }) async {
    final clientEventUuid = newUuid();
    final evidencePath = evidenceSourcePath == null
        ? null
        : await _persistEvidence(clientEventUuid, evidenceSourcePath);
    final record = PendingAttendanceRecord()
      ..clientEventUuid = clientEventUuid
      ..eventType = type
      ..createdAt = DateTime.now().toUtc()
      ..nextAttemptAt = DateTime.now().toUtc()
      ..evidencePath = evidencePath
      ..payloadJson = jsonEncode({
        'clientEventUuid': clientEventUuid,
        'type': type,
        'deviceUuid': device['deviceUuid'],
        'integrityIssuedAt': integrity.issuedAt.toIso8601String(),
        'integrityExpiresAt': integrity.expiresAt.toIso8601String(),
        'clientTime': clientTime.toIso8601String(),
        'clientClockOffsetSeconds': clientClockOffsetSeconds,
        'latitude': ?latitude,
        'longitude': ?longitude,
        'accuracyMeters': ?accuracyMeters,
        'mockLocation': ?mockLocation,
        'appVersion': device['appVersion'],
        'osVersion': device['osVersion'],
      });
    try {
      await _secrets.writeIntegrityToken(clientEventUuid, integrity.token);
      await _queue.enqueueAttendance(record);
      return clientEventUuid;
    } catch (_) {
      await _secrets.deleteIntegrityToken(clientEventUuid);
      if (evidencePath != null) await _deleteIfPresent(evidencePath);
      rethrow;
    }
  }

  Future<String> _persistEvidence(String eventId, String sourcePath) async {
    final bytes = await _imageProcessor.process(sourcePath);
    final root = await getApplicationSupportDirectory();
    final directory = Directory('${root.path}/pending_attendance_evidence');
    await directory.create(recursive: true);
    final file = File('${directory.path}/$eventId.jpg');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }
}

Future<void> _deleteIfPresent(String path) async {
  try {
    await File(path).delete();
  } on FileSystemException {
    // Cleanup is best effort after a failed queue transaction.
  }
}

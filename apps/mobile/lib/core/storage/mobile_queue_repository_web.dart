import 'dart:async';

import 'mobile_queue_models_web.dart';
import '../session/mobile_identity_scope.dart';

class MobileQueueRepository {
  MobileQueueRepository(this.scope);

  final MobileIdentityScope scope;

  final _attendance = <PendingAttendanceRecord>[];
  final _pingBatches = <PendingFieldPingBatch>[];
  final _changes = StreamController<void>.broadcast();
  LocalFieldSession? _session;
  int _nextId = 1;

  static Future<MobileQueueRepository> open({
    MobileIdentityScope? scope,
  }) async {
    if (scope == null || !scope.isComplete) {
      throw StateError('A complete mobile identity scope is required.');
    }
    return MobileQueueRepository(scope);
  }

  Future<void> enqueueAttendance(PendingAttendanceRecord record) async {
    if (record.scopedEventKey !=
        '${scope.ownerKey}|${record.clientEventUuid}') {
      throw StateError('Attendance record identity scope mismatch.');
    }
    record.id = record.id == 0 ? _nextId++ : record.id;
    _attendance.removeWhere(
      (item) => item.clientEventUuid == record.clientEventUuid,
    );
    _attendance.add(record);
    _changes.add(null);
  }

  Future<List<PendingAttendanceRecord>> attendanceRecords() async =>
      _attendance.where(_ownsAttendance).toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

  Stream<List<PendingAttendanceRecord>> watchAttendance() async* {
    yield await attendanceRecords();
    await for (final _ in _changes.stream) {
      yield await attendanceRecords();
    }
  }

  Future<List<PendingAttendanceRecord>> dueAttendance({int limit = 50}) async {
    final now = DateTime.now();
    final records =
        _attendance
            .where(
              (record) =>
                  _ownsAttendance(record) &&
                  (record.status == 'PENDING' ||
                      record.status == 'RETRYABLE') &&
                  !record.nextAttemptAt.isAfter(now),
            )
            .toList()
          ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return records.take(limit).toList(growable: false);
  }

  Future<void> saveAttendance(PendingAttendanceRecord record) =>
      enqueueAttendance(record);

  Future<void> savePingBatch(PendingFieldPingBatch batch) async {
    if (batch.scopedBatchKey != '${scope.ownerKey}|${batch.batchUuid}') {
      throw StateError('Field ping identity scope mismatch.');
    }
    batch.id = batch.id == 0 ? _nextId++ : batch.id;
    _pingBatches.removeWhere((item) => item.batchUuid == batch.batchUuid);
    _pingBatches.add(batch);
  }

  Future<void> deletePingBatch(int id) async =>
      _pingBatches.removeWhere((item) => item.id == id);

  Future<List<PendingFieldPingBatch>> duePingBatches({int limit = 10}) async {
    final now = DateTime.now();
    final batches =
        _pingBatches
            .where(
              (batch) =>
                  _ownsPing(batch) &&
                  (batch.status == 'PENDING' || batch.status == 'RETRYABLE') &&
                  !batch.nextAttemptAt.isAfter(now),
            )
            .toList()
          ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return batches.take(limit).toList(growable: false);
  }

  Future<void> saveSession(LocalFieldSession session) async {
    if (session.ownerKey != scope.ownerKey) {
      throw StateError('Field session identity scope mismatch.');
    }
    _session = session;
  }

  Future<LocalFieldSession?> activeSession() async =>
      _session?.active == true && _session?.ownerKey == scope.ownerKey
      ? _session
      : null;
  Future<void> stopSession() async => _session?.active = false;

  Future<void> clearCompleted({Duration age = const Duration(days: 7)}) async {
    final cutoff = DateTime.now().subtract(age);
    _attendance.removeWhere(
      (record) =>
          record.status == 'SYNCED' &&
          record.syncedAt != null &&
          record.syncedAt!.isBefore(cutoff),
    );
    _changes.add(null);
  }

  Future<void> clearTenantData() async {
    _attendance.removeWhere(_ownsAttendance);
    _pingBatches.removeWhere(_ownsPing);
    if (_session?.ownerKey == scope.ownerKey) _session = null;
    _changes.add(null);
  }

  bool _ownsAttendance(PendingAttendanceRecord record) =>
      record.scopedEventKey.startsWith('${scope.ownerKey}|');
  bool _ownsPing(PendingFieldPingBatch record) =>
      record.scopedBatchKey.startsWith('${scope.ownerKey}|');
}

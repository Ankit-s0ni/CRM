import 'dart:async';

import 'package:isar_community/isar.dart';

import 'mobile_queue_database.dart';
import 'mobile_queue_models_native.dart';
import '../session/mobile_identity_scope.dart';

class MobileQueueRepository {
  MobileQueueRepository(this._isar, this.scope);

  final Isar _isar;
  final MobileIdentityScope scope;

  static Future<MobileQueueRepository> open({
    MobileIdentityScope? scope,
  }) async {
    if (scope == null || !scope.isComplete) {
      throw StateError('A complete mobile identity scope is required.');
    }
    final repository = MobileQueueRepository(
      await MobileQueueDatabase.open(),
      scope,
    );
    await repository.quarantineLegacyRecords();
    return repository;
  }

  Future<void> enqueueAttendance(PendingAttendanceRecord record) {
    _assertAttendanceScope(record);
    return _isar.writeTxn(() => _isar.pendingAttendanceRecords.put(record));
  }

  Future<List<PendingAttendanceRecord>> attendanceRecords() async {
    final records = (await _isar.pendingAttendanceRecords.where().findAll())
        .where((record) => _ownsAttendance(record))
        .toList();
    records.sort((left, right) => right.createdAt.compareTo(left.createdAt));
    return records;
  }

  Stream<List<PendingAttendanceRecord>> watchAttendance() async* {
    yield await attendanceRecords();
    await for (final _ in _isar.pendingAttendanceRecords.watchLazy()) {
      yield await attendanceRecords();
    }
  }

  Future<List<PendingAttendanceRecord>> dueAttendance({int limit = 50}) async {
    final now = DateTime.now();
    final records =
        (await _isar.pendingAttendanceRecords.where().findAll())
            .where(
              (record) =>
                  _ownsAttendance(record) &&
                  (record.status == 'PENDING' ||
                      record.status == 'RETRYABLE') &&
                  !record.nextAttemptAt.isAfter(now),
            )
            .toList()
          ..sort((left, right) => left.createdAt.compareTo(right.createdAt));
    return records.take(limit).toList(growable: false);
  }

  Future<void> saveAttendance(PendingAttendanceRecord record) =>
      enqueueAttendance(record);

  Future<void> savePingBatch(PendingFieldPingBatch batch) {
    _assertPingScope(batch);
    return _isar.writeTxn(() => _isar.pendingFieldPingBatchs.put(batch));
  }

  Future<void> deletePingBatch(Id id) =>
      _isar.writeTxn(() => _isar.pendingFieldPingBatchs.delete(id));

  Future<List<PendingFieldPingBatch>> duePingBatches({int limit = 10}) async {
    final now = DateTime.now();
    final batches =
        (await _isar.pendingFieldPingBatchs.where().findAll())
            .where(
              (batch) =>
                  _ownsPing(batch) &&
                  (batch.status == 'PENDING' || batch.status == 'RETRYABLE') &&
                  !batch.nextAttemptAt.isAfter(now),
            )
            .toList()
          ..sort((left, right) => left.createdAt.compareTo(right.createdAt));
    return batches.take(limit).toList(growable: false);
  }

  Future<void> saveSession(LocalFieldSession session) {
    if (session.ownerKey != scope.ownerKey) {
      throw StateError('Field session does not belong to the active identity.');
    }
    return _isar.writeTxn(() => _isar.localFieldSessions.put(session));
  }

  Future<LocalFieldSession?> activeSession() async {
    final sessions = await _isar.localFieldSessions.where().findAll();
    return sessions.cast<LocalFieldSession?>().firstWhere(
      (session) =>
          session?.ownerKey == scope.ownerKey && session?.active == true,
      orElse: () => null,
    );
  }

  Future<void> stopSession() async {
    final session = await activeSession();
    if (session == null) return;
    session.active = false;
    await saveSession(session);
  }

  Future<void> clearCompleted({Duration age = const Duration(days: 7)}) async {
    final cutoff = DateTime.now().subtract(age);
    final completed = (await _isar.pendingAttendanceRecords.where().findAll())
        .where(
          (record) =>
              _ownsAttendance(record) &&
              record.status == 'SYNCED' &&
              record.syncedAt != null &&
              record.syncedAt!.isBefore(cutoff),
        )
        .map((record) => record.id)
        .toList();
    if (completed.isEmpty) return;
    await _isar.writeTxn(
      () => _isar.pendingAttendanceRecords.deleteAll(completed),
    );
  }

  Future<void> clearTenantData() async {
    final attendance = (await _isar.pendingAttendanceRecords.where().findAll())
        .where(_ownsAttendance)
        .map((record) => record.id)
        .toList();
    final pings = (await _isar.pendingFieldPingBatchs.where().findAll())
        .where(_ownsPing)
        .map((record) => record.id)
        .toList();
    final sessions = (await _isar.localFieldSessions.where().findAll())
        .where((session) => session.ownerKey == scope.ownerKey)
        .map((session) => session.id)
        .toList();
    await _isar.writeTxn(() async {
      await _isar.pendingAttendanceRecords.deleteAll(attendance);
      await _isar.pendingFieldPingBatchs.deleteAll(pings);
      await _isar.localFieldSessions.deleteAll(sessions);
    });
  }

  Future<void> quarantineLegacyRecords() async {
    final attendance = (await _isar.pendingAttendanceRecords.where().findAll())
        .where((record) => !_hasAttendanceScope(record))
        .toList();
    final pings = (await _isar.pendingFieldPingBatchs.where().findAll())
        .where((record) => !_hasPingScope(record))
        .toList();
    if (attendance.isEmpty && pings.isEmpty) return;
    for (final record in attendance) {
      record.status = 'QUARANTINED';
      record.errorCode = 'LEGACY_UNSCOPED_RECORD';
    }
    for (final record in pings) {
      record.status = 'QUARANTINED';
      record.errorCode = 'LEGACY_UNSCOPED_RECORD';
    }
    await _isar.writeTxn(() async {
      await _isar.pendingAttendanceRecords.putAll(attendance);
      await _isar.pendingFieldPingBatchs.putAll(pings);
    });
  }

  bool _ownsAttendance(PendingAttendanceRecord record) =>
      record.scopedEventKey.startsWith('${scope.ownerKey}|');
  bool _ownsPing(PendingFieldPingBatch record) =>
      record.scopedBatchKey.startsWith('${scope.ownerKey}|');
  bool _hasAttendanceScope(PendingAttendanceRecord record) =>
      record.tenantId.isNotEmpty &&
      record.userId.isNotEmpty &&
      record.membershipId.isNotEmpty &&
      record.employeeId.isNotEmpty &&
      record.deviceUuid.isNotEmpty &&
      record.contractVersion.isNotEmpty;
  bool _hasPingScope(PendingFieldPingBatch record) =>
      record.tenantId.isNotEmpty &&
      record.userId.isNotEmpty &&
      record.membershipId.isNotEmpty &&
      record.employeeId.isNotEmpty &&
      record.deviceUuid.isNotEmpty &&
      record.contractVersion.isNotEmpty;
  void _assertAttendanceScope(PendingAttendanceRecord record) {
    if (!_ownsAttendance(record) || !_hasAttendanceScope(record)) {
      throw StateError('Attendance record identity scope mismatch.');
    }
  }

  void _assertPingScope(PendingFieldPingBatch record) {
    if (!_ownsPing(record) || !_hasPingScope(record)) {
      throw StateError('Field ping identity scope mismatch.');
    }
  }
}

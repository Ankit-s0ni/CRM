import 'dart:async';

import 'package:isar_community/isar.dart';

import 'mobile_queue_database.dart';
import 'mobile_queue_models_native.dart';

class MobileQueueRepository {
  MobileQueueRepository(this._isar);

  final Isar _isar;

  static Future<MobileQueueRepository> open() async =>
      MobileQueueRepository(await MobileQueueDatabase.open());

  Future<void> enqueueAttendance(PendingAttendanceRecord record) =>
      _isar.writeTxn(() => _isar.pendingAttendanceRecords.put(record));

  Future<List<PendingAttendanceRecord>> attendanceRecords() async {
    final records = await _isar.pendingAttendanceRecords.where().findAll();
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
                  (record.status == 'PENDING' ||
                      record.status == 'RETRYABLE') &&
                  !record.nextAttemptAt.isAfter(now),
            )
            .toList()
          ..sort((left, right) => left.createdAt.compareTo(right.createdAt));
    return records.take(limit).toList(growable: false);
  }

  Future<void> saveAttendance(PendingAttendanceRecord record) =>
      _isar.writeTxn(() => _isar.pendingAttendanceRecords.put(record));

  Future<void> savePingBatch(PendingFieldPingBatch batch) =>
      _isar.writeTxn(() => _isar.pendingFieldPingBatchs.put(batch));

  Future<void> deletePingBatch(Id id) =>
      _isar.writeTxn(() => _isar.pendingFieldPingBatchs.delete(id));

  Future<List<PendingFieldPingBatch>> duePingBatches({int limit = 10}) async {
    final now = DateTime.now();
    final batches =
        (await _isar.pendingFieldPingBatchs.where().findAll())
            .where(
              (batch) =>
                  (batch.status == 'PENDING' || batch.status == 'RETRYABLE') &&
                  !batch.nextAttemptAt.isAfter(now),
            )
            .toList()
          ..sort((left, right) => left.createdAt.compareTo(right.createdAt));
    return batches.take(limit).toList(growable: false);
  }

  Future<void> saveSession(LocalFieldSession session) =>
      _isar.writeTxn(() => _isar.localFieldSessions.put(session));

  Future<LocalFieldSession?> activeSession() async {
    final session = await _isar.localFieldSessions.get(1);
    return session?.active == true ? session : null;
  }

  Future<void> stopSession() async {
    final session = await _isar.localFieldSessions.get(1);
    if (session == null) return;
    session.active = false;
    await saveSession(session);
  }

  Future<void> clearCompleted({Duration age = const Duration(days: 7)}) async {
    final cutoff = DateTime.now().subtract(age);
    final completed = (await _isar.pendingAttendanceRecords.where().findAll())
        .where(
          (record) =>
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

  Future<void> clearTenantData() => _isar.writeTxn(() => _isar.clear());
}

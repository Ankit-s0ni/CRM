import 'package:isar_community/isar.dart';

part 'mobile_queue_models_native.g.dart';

@collection
class PendingAttendanceRecord {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String clientEventUuid;

  late String eventType;
  late String payloadJson;
  String? evidencePath;
  String status = 'PENDING';
  int attempts = 0;
  late DateTime createdAt;
  late DateTime nextAttemptAt;
  DateTime? syncedAt;
  String? errorCode;
  bool regularizationSuggested = false;
}

@collection
class PendingFieldPingBatch {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String batchUuid;

  late String sessionId;
  late String deviceUuid;
  late String itemsJson;
  String status = 'PENDING';
  int attempts = 0;
  late DateTime createdAt;
  late DateTime nextAttemptAt;
  DateTime? syncedAt;
  String? errorCode;
}

@collection
class LocalFieldSession {
  Id id = 1;
  late String serverSessionId;
  late String clientStartUuid;
  late String deviceUuid;
  late DateTime startedAt;
  DateTime? lastPingAt;
  int capturedPingCount = 0;
  bool active = true;
}

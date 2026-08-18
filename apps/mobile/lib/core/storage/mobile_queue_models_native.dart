import 'package:isar_community/isar.dart';

part 'mobile_queue_models_native.g.dart';

@collection
class PendingAttendanceRecord {
  Id id = Isar.autoIncrement;

  @Index()
  late String clientEventUuid;

  @Index(unique: true, replace: true)
  late String scopedEventKey;

  late String tenantId;
  late String userId;
  late String membershipId;
  late String employeeId;
  late String deviceUuid;
  late String contractVersion;

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

  @Index()
  late String batchUuid;

  @Index(unique: true, replace: true)
  late String scopedBatchKey;

  late String tenantId;
  late String userId;
  late String membershipId;
  late String employeeId;
  late String contractVersion;

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
  Id id = Isar.autoIncrement;
  @Index(unique: true, replace: true)
  late String ownerKey;
  late String tenantId;
  late String userId;
  late String membershipId;
  late String employeeId;
  late String contractVersion;
  late String serverSessionId;
  late String clientStartUuid;
  late String deviceUuid;
  late DateTime startedAt;
  DateTime? lastPingAt;
  int capturedPingCount = 0;
  bool active = true;
}

class PendingAttendanceRecord {
  int id = 0;
  late String clientEventUuid;
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

class PendingFieldPingBatch {
  int id = 0;
  late String batchUuid;
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

class LocalFieldSession {
  int id = 0;
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

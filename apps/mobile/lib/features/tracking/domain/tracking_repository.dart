class FieldTrackingSession {
  const FieldTrackingSession({
    required this.id,
    required this.deviceUuid,
    required this.clientStartUuid,
    required this.startedAt,
    this.lastPingAt,
  });

  final String id;
  final String deviceUuid;
  final String clientStartUuid;
  final DateTime startedAt;
  final DateTime? lastPingAt;
}

class FieldPingCapture {
  const FieldPingCapture({
    required this.sessionId,
    required this.latitude,
    required this.longitude,
    required this.accuracyM,
    required this.speedMps,
    required this.batteryLevel,
    required this.isMock,
    required this.capturedAt,
  });

  final String sessionId;
  final double latitude;
  final double longitude;
  final int accuracyM;
  final double? speedMps;
  final int? batteryLevel;
  final bool isMock;
  final DateTime capturedAt;
}

abstract interface class TrackingRepository {
  Future<FieldTrackingSession?> active(String deviceUuid);
  Future<FieldTrackingSession> start({
    required String deviceUuid,
    required String clientStartUuid,
  });
  Future<void> stop(String sessionId, {required String reason});
  Future<void> queuePing(String deviceUuid, FieldPingCapture capture);
  Future<void> flushPending();
}

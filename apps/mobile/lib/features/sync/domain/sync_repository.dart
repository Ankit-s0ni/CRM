class SyncQueueItem {
  const SyncQueueItem({
    required this.clientEventUuid,
    required this.eventType,
    required this.status,
    required this.createdAt,
    required this.attempts,
    this.errorCode,
    this.regularizationSuggested = false,
  });

  final String clientEventUuid;
  final String eventType;
  final String status;
  final DateTime createdAt;
  final int attempts;
  final String? errorCode;
  final bool regularizationSuggested;

  bool get canRetry => status == 'PENDING' || status == 'RETRYABLE';
}

abstract interface class SyncRepository {
  Future<List<SyncQueueItem>> items();
  Stream<List<SyncQueueItem>> watchItems();
  Future<void> replayPending({String? clientEventUuid, bool force = false});
}

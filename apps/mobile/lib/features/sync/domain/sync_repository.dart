abstract interface class SyncRepository {
  Future<void> replayPending();
}

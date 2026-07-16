abstract interface class TrackingRepository {
  Future<void> start();
  Future<void> stop();
  Future<void> sendPing(double latitude, double longitude);
}

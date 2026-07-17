abstract interface class DeviceRepository {
  Future<void> register(Map<String, dynamic> device);
  Future<Map<String, dynamic>> current();
  Future<void> unregister();
}

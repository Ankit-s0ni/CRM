abstract interface class ProfileRepository {
  Future<Map<String, dynamic>> load();
}

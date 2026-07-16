abstract interface class RequestsRepository {
  Future<void> createRegularization(Map<String, dynamic> request);
  Future<List<Map<String, dynamic>>> mine();
}

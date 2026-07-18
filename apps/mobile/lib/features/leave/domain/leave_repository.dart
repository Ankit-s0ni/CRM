abstract interface class LeaveRepository {
  Future<List<Map<String, dynamic>>> balances();
  Future<List<Map<String, dynamic>>> policies();
  Future<List<Map<String, dynamic>>> requests();
  Future<void> createRequest(Map<String, dynamic> request);
  Future<void> cancel(String id);
}

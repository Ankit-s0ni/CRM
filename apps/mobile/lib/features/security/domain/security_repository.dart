abstract interface class SecurityRepository {
  Future<List<Map<String, dynamic>>> verificationLogs();
}

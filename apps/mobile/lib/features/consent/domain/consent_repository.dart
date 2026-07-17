abstract interface class ConsentRepository {
  Future<Map<String, dynamic>?> current();
  Future<void> accept(String policyVersion);
  Future<void> withdraw();
}

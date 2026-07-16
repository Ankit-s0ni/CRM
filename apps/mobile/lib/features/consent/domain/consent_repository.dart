abstract interface class ConsentRepository {
  Future<void> accept(String policyVersion);
  Future<void> withdraw();
}

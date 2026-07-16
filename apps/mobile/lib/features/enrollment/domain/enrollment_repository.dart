abstract interface class EnrollmentRepository {
  Future<void> complete(String privateObjectKey, String proofToken);
}

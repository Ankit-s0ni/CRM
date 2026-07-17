abstract interface class EnrollmentRepository {
  Future<Map<String, dynamic>> status();
  Future<void> enroll(String filePath);
}

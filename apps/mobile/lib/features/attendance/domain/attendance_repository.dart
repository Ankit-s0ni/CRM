abstract interface class AttendanceRepository {
  Future<void> punch(Map<String, dynamic> payload);
  Future<void> toggleBreak(String action);
  Future<List<Map<String, dynamic>>> history({String? month});
  Future<Map<String, dynamic>> day(String date);
}

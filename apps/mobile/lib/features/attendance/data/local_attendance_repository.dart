import '../domain/attendance_repository.dart';

class LocalAttendanceRepository implements AttendanceRepository {
  const LocalAttendanceRepository();

  @override
  Future<void> punch(Map<String, dynamic> payload) async =>
      Future<void>.delayed(const Duration(milliseconds: 350));

  @override
  Future<void> toggleBreak(String action) async =>
      Future<void>.delayed(const Duration(milliseconds: 250));

  @override
  Future<List<Map<String, dynamic>>> history({String? month}) async => const [];

  @override
  Future<Map<String, dynamic>> day(String date) async => const {};
}

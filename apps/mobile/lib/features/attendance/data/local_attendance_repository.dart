import '../domain/attendance_repository.dart';
import '../domain/monthly_attendance_history.dart';

class LocalAttendanceRepository implements AttendanceRepository {
  const LocalAttendanceRepository();

  @override
  Future<PunchResult> punch({
    required String type,
    String? filePath,
    required Map<String, String> device,
    double? latitude,
    double? longitude,
    int? accuracyMeters,
    bool? mockLocation,
    required String attestationToken,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 350));
    return PunchResult(
      verificationId: 'local',
      checks: const ['device', 'integrity', 'location'],
      attendance: const {},
    );
  }

  @override
  Future<void> toggleBreak(String action) async =>
      Future<void>.delayed(const Duration(milliseconds: 250));

  @override
  Future<MonthlyAttendanceHistory> history({required String month}) async =>
      MonthlyAttendanceHistory.empty(month);

  @override
  Future<Map<String, dynamic>> day(String date) async => const {};
}

import 'monthly_attendance_history.dart';

abstract interface class AttendanceRepository {
  Future<PunchResult> punch({
    required String type,
    String? filePath,
    required Map<String, String> device,
    double? latitude,
    double? longitude,
    int? accuracyMeters,
    bool? mockLocation,
    required String attestationToken,
  });
  Future<void> toggleBreak(String action);
  Future<MonthlyAttendanceHistory> history({required String month});
  Future<Map<String, dynamic>> day(String date);
}

class PunchResult {
  const PunchResult({
    required this.verificationId,
    required this.checks,
    required this.attendance,
  });

  final String verificationId;
  final List<String> checks;
  final Map<String, dynamic> attendance;
}

class PunchFailure implements Exception {
  const PunchFailure({
    required this.code,
    required this.message,
    this.details = const {},
  });

  final String code;
  final String message;
  final Map<String, dynamic> details;
}

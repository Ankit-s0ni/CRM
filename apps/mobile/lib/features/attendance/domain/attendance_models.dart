import 'attendance_repository.dart';

enum AttendancePhase { idle, verifying, checkedIn, onBreak, checkedOut }

class AttendanceState {
  const AttendanceState({
    this.phase = AttendancePhase.idle,
    this.checkInTime,
    this.breakStartedAt,
    this.lastPunch,
    this.failure,
  });
  final AttendancePhase phase;
  final DateTime? checkInTime;
  final DateTime? breakStartedAt;
  final PunchResult? lastPunch;
  final PunchFailure? failure;

  AttendanceState copyWith({
    AttendancePhase? phase,
    DateTime? checkInTime,
    DateTime? breakStartedAt,
    PunchResult? lastPunch,
    PunchFailure? failure,
  }) => AttendanceState(
    phase: phase ?? this.phase,
    checkInTime: checkInTime ?? this.checkInTime,
    breakStartedAt: breakStartedAt ?? this.breakStartedAt,
    lastPunch: lastPunch ?? this.lastPunch,
    failure: failure,
  );
}

class PunchCapture {
  const PunchCapture({required this.filePath, required this.isCheckOut});
  final String filePath;
  final bool isCheckOut;
}

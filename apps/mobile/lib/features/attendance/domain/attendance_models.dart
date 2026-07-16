enum AttendancePhase { idle, verifying, checkedIn, onBreak, checkedOut }

class AttendanceState {
  const AttendanceState({
    this.phase = AttendancePhase.idle,
    this.checkInTime,
    this.breakStartedAt,
  });
  final AttendancePhase phase;
  final DateTime? checkInTime;
  final DateTime? breakStartedAt;

  AttendanceState copyWith({
    AttendancePhase? phase,
    DateTime? checkInTime,
    DateTime? breakStartedAt,
  }) => AttendanceState(
    phase: phase ?? this.phase,
    checkInTime: checkInTime ?? this.checkInTime,
    breakStartedAt: breakStartedAt ?? this.breakStartedAt,
  );
}

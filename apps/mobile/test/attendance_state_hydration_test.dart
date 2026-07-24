import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/features/attendance/domain/attendance_repository.dart';
import 'package:hrms_attendance/features/attendance/domain/attendance_models.dart';
import 'package:hrms_attendance/features/attendance/domain/monthly_attendance_history.dart';
import 'package:hrms_attendance/features/attendance/presentation/attendance_controller.dart';

void main() {
  test('restores an open attendance day as checked in', () async {
    final container = ProviderContainer(
      overrides: [
        attendanceRepositoryProvider.overrideWithValue(
          const _TodayRepository('CHECKOUT'),
        ),
      ],
    );
    addTearDown(container.dispose);

    final state = await container.read(attendanceControllerProvider.future);

    expect(state.phase, AttendancePhase.checkedIn);
    expect(
      state.checkInTime,
      DateTime.parse('2026-07-24T05:10:00.000Z').toLocal(),
    );
  });

  test('restores an active break from the server action', () async {
    final container = ProviderContainer(
      overrides: [
        attendanceRepositoryProvider.overrideWithValue(
          const _TodayRepository('BREAK_END'),
        ),
      ],
    );
    addTearDown(container.dispose);

    final state = await container.read(attendanceControllerProvider.future);

    expect(state.phase, AttendancePhase.onBreak);
  });
}

class _TodayRepository implements AttendanceRepository {
  const _TodayRepository(this.openAction);

  final String openAction;

  @override
  Future<Map<String, dynamic>> today() async => {
    'data': {
      'openAction': openAction,
      'timeline': [
        {'eventType': 'CHECKIN', 'eventTime': '2026-07-24T05:10:00.000Z'},
      ],
    },
  };

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
  }) => throw UnimplementedError();

  @override
  Future<void> toggleBreak(String action) => throw UnimplementedError();

  @override
  Future<MonthlyAttendanceHistory> history({required String month}) =>
      throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> day(String date) => throw UnimplementedError();
}

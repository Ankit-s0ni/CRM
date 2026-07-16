import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_config.dart';
import '../../../core/network/network_providers.dart';
import '../data/attendance_api_repository.dart';
import '../data/local_attendance_repository.dart';
import '../domain/attendance_models.dart';
import '../domain/attendance_repository.dart';

final attendanceRepositoryProvider = Provider<AttendanceRepository>(
  (ref) => AppConfig.localMode
      ? const LocalAttendanceRepository()
      : AttendanceApiRepository(ref.watch(apiServiceProvider)),
);

final attendanceControllerProvider =
    AsyncNotifierProvider<AttendanceController, AttendanceState>(
      AttendanceController.new,
    );

class AttendanceController extends AsyncNotifier<AttendanceState> {
  AttendanceRepository get _repository =>
      ref.read(attendanceRepositoryProvider);

  @override
  Future<AttendanceState> build() async => const AttendanceState();

  Future<void> checkIn(Map<String, dynamic> verificationPayload) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _repository.punch({...verificationPayload, 'type': 'CHECK_IN'});
      return AttendanceState(
        phase: AttendancePhase.checkedIn,
        checkInTime: DateTime.now(),
      );
    });
  }

  Future<void> checkOut(Map<String, dynamic> verificationPayload) async {
    final current = state.value ?? const AttendanceState();
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _repository.punch({...verificationPayload, 'type': 'CHECK_OUT'});
      return AttendanceState(
        phase: AttendancePhase.checkedOut,
        checkInTime: current.checkInTime,
      );
    });
  }

  Future<void> startBreak() async {
    final current = state.value ?? const AttendanceState();
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _repository.toggleBreak('START');
      return current.copyWith(
        phase: AttendancePhase.onBreak,
        breakStartedAt: DateTime.now(),
      );
    });
  }

  Future<void> endBreak() async {
    final current = state.value ?? const AttendanceState();
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _repository.toggleBreak('END');
      return current.copyWith(phase: AttendancePhase.checkedIn);
    });
  }
}

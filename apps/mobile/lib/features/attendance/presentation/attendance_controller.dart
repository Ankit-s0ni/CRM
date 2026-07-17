import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/config/app_config.dart';
import '../../../core/device/device_identity.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/security/integrity_token_provider.dart';
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

final attendanceHistoryProvider = FutureProvider.autoDispose
    .family<List<Map<String, dynamic>>, String>(
      (ref, month) =>
          ref.read(attendanceRepositoryProvider).history(month: month),
    );

final attendanceDayProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>(
      (ref, date) => ref.read(attendanceRepositoryProvider).day(date),
    );

class AttendanceController extends AsyncNotifier<AttendanceState> {
  AttendanceRepository get _repository =>
      ref.read(attendanceRepositoryProvider);

  @override
  Future<AttendanceState> build() async => const AttendanceState();

  Future<bool> verifyPunch(PunchCapture capture) async {
    final current = state.asData?.value ?? const AttendanceState();
    state = AsyncData(current.copyWith(phase: AttendancePhase.verifying));
    try {
      final position = await _position();
      final identity = await ref.read(deviceIdentityProvider).payload();
      final token = await const IntegrityTokenProvider().token();
      final result = await _repository.punch(
        type: capture.isCheckOut ? 'CHECKOUT' : 'CHECKIN',
        filePath: capture.filePath,
        device: identity,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy.round(),
        mockLocation: position.isMocked,
        attestationToken: token,
      );
      state = AsyncData(
        AttendanceState(
          phase: capture.isCheckOut
              ? AttendancePhase.checkedOut
              : AttendancePhase.checkedIn,
          checkInTime: capture.isCheckOut
              ? current.checkInTime
              : DateTime.now(),
          lastPunch: result,
        ),
      );
      return true;
    } on PunchFailure catch (failure) {
      state = AsyncData(current.copyWith(failure: failure));
      return false;
    } on IntegrityProviderUnavailable {
      state = AsyncData(
        current.copyWith(
          failure: const PunchFailure(
            code: 'VERIFICATION_PROVIDER_UNAVAILABLE',
            message: 'Device verification is temporarily unavailable.',
          ),
        ),
      );
      return false;
    } catch (_) {
      state = AsyncData(
        current.copyWith(
          failure: const PunchFailure(
            code: 'VERIFICATION_FAILED',
            message: 'Attendance verification could not be completed.',
          ),
        ),
      );
      return false;
    } finally {
      try {
        await File(capture.filePath).delete();
      } catch (_) {
        // Camera plugins may already remove temporary files.
      }
    }
  }

  Future<Position> _position() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const PunchFailure(
        code: 'LOCATION_DISABLED',
        message: 'Enable location services and try again.',
      );
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const PunchFailure(
        code: 'LOCATION_PERMISSION_DENIED',
        message: 'Location permission is required for attendance.',
      );
    }
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );
  }

  Future<void> startBreak() async {
    final current = state.asData?.value ?? const AttendanceState();
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
    final current = state.asData?.value ?? const AttendanceState();
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _repository.toggleBreak('END');
      return current.copyWith(phase: AttendancePhase.checkedIn);
    });
  }
}

import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import '../../../core/config/app_config.dart';
import '../../../core/device/device_identity.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/security/integrity_token_provider.dart';
import '../../../core/tenant/tenant_controller.dart';
import '../../sync/presentation/sync_controller.dart';
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
    final clientTime = DateTime.now().toUtc();
    Position? capturedPosition;
    late Map<String, String> capturedIdentity;
    late IntegrityEvidence capturedIntegrity;
    state = AsyncData(current.copyWith(phase: AttendancePhase.verifying));
    try {
      final policy = ref.read(tenantControllerProvider).attendancePolicy;
      if (!policy.canPunch) {
        throw const PunchFailure(
          code: 'CAPABILITY_NOT_ENABLED',
          message: 'Attendance is not enabled for this workspace.',
        );
      }
      if (policy.requiresLocation) capturedPosition = await _position();
      capturedIdentity = await ref.read(deviceIdentityProvider).payload();
      capturedIntegrity = await IntegrityTokenProvider(
        ref.read(apiServiceProvider),
      ).evidence(capturedIdentity['deviceUuid']!);
      final result = await _repository.punch(
        type: capture.isCheckOut ? 'CHECKOUT' : 'CHECKIN',
        filePath: capture.filePath,
        device: capturedIdentity,
        latitude: capturedPosition?.latitude,
        longitude: capturedPosition?.longitude,
        accuracyMeters: capturedPosition?.accuracy.round(),
        mockLocation: capturedPosition?.isMocked,
        attestationToken: capturedIntegrity.token,
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
      if (const {
        'MODULE_ACCESS_DENIED',
        'CAPABILITY_NOT_ENABLED',
        'FIELD_TRACKING_NOT_ELIGIBLE',
        'ONBOARDING_REQUIRED',
      }.contains(failure.code)) {
        try {
          await ref.read(tenantControllerProvider.notifier).refreshRuntime();
        } catch (_) {
          // The original authoritative denial remains the user-facing result.
        }
      }
      if (failure.code == 'NETWORK_UNAVAILABLE') {
        try {
          final eventId =
              await (await ref.read(
                attendanceOfflineQueueProvider.future,
              )).enqueue(
                type: capture.isCheckOut ? 'CHECKOUT' : 'CHECKIN',
                device: capturedIdentity,
                integrity: capturedIntegrity,
                clientTime: clientTime,
                clientClockOffsetSeconds: 0,
                latitude: capturedPosition?.latitude,
                longitude: capturedPosition?.longitude,
                accuracyMeters: capturedPosition?.accuracy.round(),
                mockLocation: capturedPosition?.isMocked,
                evidenceSourcePath: capture.filePath,
              );
          AppLogger.info('attendance_saved_offline event=$eventId');
          state = AsyncData(
            AttendanceState(
              phase: capture.isCheckOut
                  ? AttendancePhase.checkedOut
                  : AttendancePhase.checkedIn,
              checkInTime: capture.isCheckOut
                  ? current.checkInTime
                  : DateTime.now(),
              lastPunch: PunchResult(
                verificationId: eventId,
                checks: const ['SAVED_OFFLINE'],
                attendance: const {'syncStatus': 'PENDING'},
              ),
            ),
          );
          return true;
        } catch (error, stack) {
          AppLogger.error('attendance_offline_save_failed', error, stack);
        }
      }
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
        if (capture.filePath != null) await File(capture.filePath!).delete();
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
      try {
        await _repository.toggleBreak('START');
      } on DioException catch (error) {
        if (!_isNetworkFailure(error)) rethrow;
        await _queueOfflineTransition('BREAK_START');
      }
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
      try {
        await _repository.toggleBreak('END');
      } on DioException catch (error) {
        if (!_isNetworkFailure(error)) rethrow;
        await _queueOfflineTransition('BREAK_END');
      }
      return current.copyWith(phase: AttendancePhase.checkedIn);
    });
  }

  Future<void> _queueOfflineTransition(String type) async {
    final position = await _position();
    final identity = await ref.read(deviceIdentityProvider).payload();
    final evidence = await IntegrityTokenProvider(
      ref.read(apiServiceProvider),
    ).evidence(identity['deviceUuid']!, offline: true);
    final eventId =
        await (await ref.read(attendanceOfflineQueueProvider.future)).enqueue(
          type: type,
          device: identity,
          integrity: evidence,
          clientTime: DateTime.now().toUtc(),
          clientClockOffsetSeconds: 0,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracyMeters: position.accuracy.round(),
          mockLocation: position.isMocked,
        );
    AppLogger.info('attendance_transition_saved_offline event=$eventId');
  }
}

bool _isNetworkFailure(DioException error) =>
    error.response == null ||
    const {
      DioExceptionType.connectionError,
      DioExceptionType.connectionTimeout,
      DioExceptionType.receiveTimeout,
      DioExceptionType.sendTimeout,
    }.contains(error.type);

import 'dart:async';

import 'package:battery_plus/battery_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/background/mobile_background_tasks.dart';
import '../../../core/device/device_identity.dart';
import '../../../core/logging/app_logger.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/tenant/tenant_controller.dart';
import '../../../core/tenant/tenant_config.dart';
import '../../../core/utils/uuid.dart';
import '../../sync/presentation/sync_controller.dart';
import '../data/tracking_api_repository.dart';
import '../domain/tracking_repository.dart';

class TrackingViewState {
  const TrackingViewState({
    this.session,
    this.locationPermission = 'UNKNOWN',
    this.backgroundPermission = 'UNKNOWN',
    this.batteryLevel,
    this.pingCount = 0,
    this.lastPingAt,
    this.lastLatitude,
    this.lastLongitude,
    this.updating = false,
    this.errorCode,
  });

  final FieldTrackingSession? session;
  final String locationPermission;
  final String backgroundPermission;
  final int? batteryLevel;
  final int pingCount;
  final DateTime? lastPingAt;
  final double? lastLatitude;
  final double? lastLongitude;
  final bool updating;
  final String? errorCode;

  bool get active => session != null;

  TrackingViewState copyWith({
    FieldTrackingSession? session,
    bool clearSession = false,
    String? locationPermission,
    String? backgroundPermission,
    int? batteryLevel,
    int? pingCount,
    DateTime? lastPingAt,
    double? lastLatitude,
    double? lastLongitude,
    bool? updating,
    String? errorCode,
    bool clearError = false,
  }) => TrackingViewState(
    session: clearSession ? null : session ?? this.session,
    locationPermission: locationPermission ?? this.locationPermission,
    backgroundPermission: backgroundPermission ?? this.backgroundPermission,
    batteryLevel: batteryLevel ?? this.batteryLevel,
    pingCount: pingCount ?? this.pingCount,
    lastPingAt: lastPingAt ?? this.lastPingAt,
    lastLatitude: lastLatitude ?? this.lastLatitude,
    lastLongitude: lastLongitude ?? this.lastLongitude,
    updating: updating ?? this.updating,
    errorCode: clearError ? null : errorCode ?? this.errorCode,
  );
}

final trackingRepositoryProvider = FutureProvider<TrackingRepository>(
  (ref) async => TrackingApiRepository(
    ref.watch(apiServiceProvider),
    await ref.watch(mobileQueueRepositoryProvider.future),
  ),
);

final trackingControllerProvider =
    AsyncNotifierProvider<TrackingController, TrackingViewState>(
      TrackingController.new,
    );

class TrackingController extends AsyncNotifier<TrackingViewState> {
  Timer? _foregroundTimer;
  bool _capturing = false;

  @override
  Future<TrackingViewState> build() async {
    ref.onDispose(() => _foregroundTimer?.cancel());
    if (!ref
        .read(tenantControllerProvider)
        .hasModule(TenantModule.fieldTracking)) {
      await MobileBackgroundTasks.cancelTracking();
      await (await ref.watch(
        mobileQueueRepositoryProvider.future,
      )).stopSession();
      return const TrackingViewState(errorCode: 'CAPABILITY_NOT_ENABLED');
    }
    final identity = await ref.read(deviceIdentityProvider).payload();
    final repository = await ref.watch(trackingRepositoryProvider.future);
    FieldTrackingSession? session;
    String? errorCode;
    try {
      session = await repository.active(identity['deviceUuid']!);
    } catch (error, stack) {
      AppLogger.warning('field_session_restore_failed', error, stack);
      errorCode = 'FIELD_SESSION_UNAVAILABLE';
    }
    final capabilities = await _capabilities();
    final local = await (await ref.watch(
      mobileQueueRepositoryProvider.future,
    )).activeSession();
    if (session != null) _startForegroundTimer();
    return TrackingViewState(
      session: session,
      locationPermission: capabilities.$1,
      backgroundPermission: capabilities.$2,
      batteryLevel: capabilities.$3,
      pingCount: local?.capturedPingCount ?? 0,
      lastPingAt: local?.lastPingAt,
      errorCode: errorCode,
    );
  }

  Future<bool> start() async {
    final current = state.valueOrNull ?? const TrackingViewState();
    state = AsyncData(current.copyWith(updating: true, clearError: true));
    try {
      if (!ref
          .read(tenantControllerProvider)
          .hasModule(TenantModule.fieldTracking)) {
        throw const TrackingException('CAPABILITY_NOT_ENABLED');
      }
      await _requireLocationPermissions();
      final identity = await ref.read(deviceIdentityProvider).payload();
      final repository = await ref.read(trackingRepositoryProvider.future);
      final session = await repository.start(
        deviceUuid: identity['deviceUuid']!,
        clientStartUuid: newUuid(),
      );
      final capabilities = await _capabilities();
      state = AsyncData(
        current.copyWith(
          session: session,
          locationPermission: capabilities.$1,
          backgroundPermission: capabilities.$2,
          batteryLevel: capabilities.$3,
          updating: false,
          clearError: true,
        ),
      );
      _startForegroundTimer();
      await MobileBackgroundTasks.scheduleTracking(
        batteryLevel: capabilities.$3 ?? 100,
        trackingIntervalMinutes: ref
            .read(tenantControllerProvider)
            .attendancePolicy
            .trackingIntervalMinutes,
      );
      await captureNow();
      return true;
    } catch (error, stack) {
      AppLogger.error('field_tracking_start_failed', error, stack);
      await _refreshAfterAuthoritativeDenial(error);
      state = AsyncData(
        current.copyWith(updating: false, errorCode: _trackingCode(error)),
      );
      return false;
    }
  }

  Future<bool> stop({String reason = 'MANUAL'}) async {
    final current = state.valueOrNull ?? const TrackingViewState();
    final session = current.session;
    if (session == null) return true;
    state = AsyncData(current.copyWith(updating: true, clearError: true));
    try {
      await (await ref.read(
        trackingRepositoryProvider.future,
      )).stop(session.id, reason: reason);
      _foregroundTimer?.cancel();
      await MobileBackgroundTasks.cancelTracking();
      state = AsyncData(
        current.copyWith(clearSession: true, updating: false, clearError: true),
      );
      return true;
    } catch (error, stack) {
      AppLogger.error('field_tracking_stop_failed', error, stack);
      state = AsyncData(
        current.copyWith(updating: false, errorCode: _trackingCode(error)),
      );
      return false;
    }
  }

  Future<void> captureNow() async {
    if (_capturing) return;
    final current = state.valueOrNull;
    final session = current?.session;
    if (session == null) return;
    if (!ref
        .read(tenantControllerProvider)
        .hasModule(TenantModule.fieldTracking)) {
      await stop(reason: 'ADMINISTRATOR');
      return;
    }
    _capturing = true;
    try {
      final identity = await ref.read(deviceIdentityProvider).payload();
      final capture = await _capture(session, identity['deviceUuid']!);
      final local = await (await ref.read(
        mobileQueueRepositoryProvider.future,
      )).activeSession();
      if (local != null && state.valueOrNull != null) {
        state = AsyncData(
          state.valueOrNull!.copyWith(
            pingCount: local.capturedPingCount,
            lastPingAt: local.lastPingAt,
            lastLatitude: capture.latitude,
            lastLongitude: capture.longitude,
            clearError: true,
          ),
        );
      }
    } catch (error, stack) {
      AppLogger.warning('field_ping_capture_failed', error, stack);
      final disabled = await _refreshAfterAuthoritativeDenial(error);
      final value = state.valueOrNull;
      if (value != null) {
        state = AsyncData(
          value.copyWith(
            clearSession: disabled,
            errorCode: _trackingCode(error),
          ),
        );
      }
    } finally {
      _capturing = false;
    }
  }

  void _startForegroundTimer() {
    _foregroundTimer?.cancel();
    final battery = state.valueOrNull?.batteryLevel ?? 100;
    final configured = ref
        .read(tenantControllerProvider)
        .attendancePolicy
        .trackingIntervalMinutes
        .clamp(5, 60);
    final minutes = battery <= 20 ? (configured * 2).clamp(10, 60) : configured;
    _foregroundTimer = Timer.periodic(
      Duration(minutes: minutes),
      (_) => captureNow(),
    );
  }

  Future<FieldPingCapture> _capture(
    FieldTrackingSession session,
    String deviceUuid,
  ) async {
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 20),
      ),
    );
    int? batteryLevel;
    try {
      batteryLevel = await Battery().batteryLevel;
    } catch (_) {
      batteryLevel = null;
    }
    final repository = await ref.read(trackingRepositoryProvider.future);
    final capture = FieldPingCapture(
      sessionId: session.id,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyM: position.accuracy.round().clamp(0, 5000),
      speedMps: position.speed < 0 ? null : position.speed.clamp(0, 100),
      batteryLevel: batteryLevel,
      isMock: position.isMocked,
      capturedAt: position.timestamp,
    );
    await repository.queuePing(deviceUuid, capture);
    await repository.flushPending();
    return capture;
  }

  Future<void> _requireLocationPermissions() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const TrackingException('LOCATION_DISABLED');
    }
    var foreground = await Geolocator.checkPermission();
    if (foreground == LocationPermission.denied) {
      foreground = await Geolocator.requestPermission();
    }
    if (foreground == LocationPermission.denied ||
        foreground == LocationPermission.deniedForever) {
      throw const TrackingException('LOCATION_PERMISSION_DENIED');
    }
    final background = await Permission.locationAlways.status;
    if (!background.isGranted) {
      final requested = await Permission.locationAlways.request();
      if (!requested.isGranted) {
        throw const TrackingException('BACKGROUND_LOCATION_REQUIRED');
      }
    }
  }

  Future<(String, String, int?)> _capabilities() async {
    final foreground = await Permission.locationWhenInUse.status;
    final background = await Permission.locationAlways.status;
    int? battery;
    try {
      battery = await Battery().batteryLevel;
    } catch (_) {
      battery = null;
    }
    return (
      foreground.isGranted ? 'GRANTED' : foreground.name.toUpperCase(),
      background.isGranted ? 'GRANTED' : background.name.toUpperCase(),
      battery,
    );
  }

  Future<bool> _refreshAfterAuthoritativeDenial(Object error) async {
    if (!_isAuthoritativeCapabilityDenial(error)) return false;
    try {
      await ref.read(tenantControllerProvider.notifier).refreshRuntime();
    } catch (_) {
      // The original server denial remains the user-facing failure.
    }
    final disabled = !ref
        .read(tenantControllerProvider)
        .hasModule(TenantModule.fieldTracking);
    if (disabled) {
      _foregroundTimer?.cancel();
      await MobileBackgroundTasks.cancelTracking();
    }
    return disabled;
  }
}

class TrackingException implements Exception {
  const TrackingException(this.code);
  final String code;
}

String _trackingCode(Object error) {
  if (error is TrackingException) return error.code;
  if (error is DioException) {
    final body = error.response?.data;
    if (body is Map<String, dynamic> && body['code'] is String) {
      return body['code'] as String;
    }
  }
  return 'FIELD_TRACKING_UNAVAILABLE';
}

bool _isAuthoritativeCapabilityDenial(Object error) => const {
  'CAPABILITY_NOT_ENABLED',
  'FIELD_TRACKING_NOT_ELIGIBLE',
  'MODULE_ACCESS_DENIED',
  'RUNTIME_CONFIG_STALE',
}.contains(_trackingCode(error));

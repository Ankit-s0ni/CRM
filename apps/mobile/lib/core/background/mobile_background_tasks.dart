import 'dart:ui';

import 'package:battery_plus/battery_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'package:workmanager/workmanager.dart';

import '../../features/sync/data/sync_api_repository.dart';
import '../../features/tracking/data/tracking_api_repository.dart';
import '../../features/tracking/domain/tracking_repository.dart';
import '../logging/app_logger.dart';
import '../network/api_service.dart';
import '../network/token_store.dart';
import '../storage/mobile_queue_repository.dart';
import '../storage/queue_secret_store.dart';
import '../tenant/tenant_runtime_repository.dart';

const _trackingUniqueName = 'hrms-field-tracking';
const _trackingTaskName = 'field-tracking-capture';
const _syncUniqueName = 'hrms-offline-sync';
const _syncTaskName = 'attendance-offline-replay';

class MobileBackgroundTasks {
  MobileBackgroundTasks._();

  static bool get supported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  static Future<void> initialize() async {
    if (!supported) return;
    await Workmanager().initialize(backgroundTaskDispatcher);
    await Workmanager().registerPeriodicTask(
      _syncUniqueName,
      _syncTaskName,
      frequency: const Duration(minutes: 15),
      constraints: Constraints(networkType: NetworkType.connected),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(seconds: 30),
    );
  }

  static Future<void> scheduleTracking({
    required int batteryLevel,
    required int trackingIntervalMinutes,
  }) async {
    if (!supported) return;
    final policyMinutes = trackingIntervalMinutes.clamp(5, 60);
    final requestedMinutes = batteryLevel <= 20
        ? policyMinutes * 2
        : policyMinutes;
    final osMinimumMinutes = batteryLevel <= 20 ? 30 : 15;
    final frequency = Duration(
      minutes: requestedMinutes < osMinimumMinutes
          ? osMinimumMinutes
          : requestedMinutes,
    );
    await Workmanager().registerPeriodicTask(
      _trackingUniqueName,
      _trackingTaskName,
      frequency: frequency,
      constraints: Constraints(requiresBatteryNotLow: false),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(seconds: 30),
    );
    AppLogger.info(
      'background_tracking_scheduled interval=${frequency.inMinutes}m',
    );
  }

  static Future<void> cancelTracking() async {
    if (!supported) return;
    try {
      await Workmanager().cancelByUniqueName(_trackingUniqueName);
    } on UnimplementedError catch (error, stack) {
      // Desktop Flutter tests report Android as the target platform even though
      // Workmanager has no desktop implementation. Cleanup must remain safe.
      AppLogger.warning('background_tracking_cancel_unsupported', error, stack);
      return;
    }
    AppLogger.info('background_tracking_cancelled');
  }

  static Future<void> requestSync() async {
    if (!supported) return;
    await Workmanager().registerOneOffTask(
      '$_syncUniqueName-now',
      _syncTaskName,
      constraints: Constraints(networkType: NetworkType.connected),
      existingWorkPolicy: ExistingWorkPolicy.replace,
      backoffPolicy: BackoffPolicy.exponential,
      backoffPolicyDelay: const Duration(seconds: 30),
    );
  }
}

@pragma('vm:entry-point')
void backgroundTaskDispatcher() {
  Workmanager().executeTask((taskName, _) async {
    DartPluginRegistrant.ensureInitialized();
    try {
      if (taskName == _trackingTaskName || taskName == _trackingUniqueName) {
        return _captureFieldPing();
      }
      if (taskName == Workmanager.iOSBackgroundTask) {
        await _captureFieldPing();
        return _replayAttendance();
      }
      if (taskName == _syncTaskName || taskName == _syncUniqueName) {
        return _replayAttendance();
      }
      return true;
    } catch (error, stack) {
      AppLogger.error('background_task_failed task=$taskName', error, stack);
      return false;
    }
  });
}

Future<bool> _captureFieldPing() async {
  final storage = const FlutterSecureStorage();
  final fieldEnabled = await storage.read(
    key: TenantRuntimeRepository.fieldRuntimeKey,
  );
  if (fieldEnabled != 'true') {
    await MobileBackgroundTasks.cancelTracking();
    return true;
  }
  final queue = await MobileQueueRepository.open();
  final local = await queue.activeSession();
  if (local == null) return true;
  final permission = await Geolocator.checkPermission();
  if (permission != LocationPermission.always &&
      permission != LocationPermission.whileInUse) {
    AppLogger.warning('background_tracking_permission_unavailable');
    return true;
  }
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
  final api = ApiService(TokenStore(storage));
  final repository = TrackingApiRepository(api, queue);
  await repository.queuePing(
    local.deviceUuid,
    FieldPingCapture(
      sessionId: local.serverSessionId,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyM: position.accuracy.round().clamp(0, 5000),
      speedMps: position.speed < 0 ? null : position.speed.clamp(0, 100),
      batteryLevel: batteryLevel,
      isMock: position.isMocked,
      capturedAt: position.timestamp,
    ),
  );
  await repository.flushPending();
  AppLogger.info('background_field_ping_completed');
  return true;
}

Future<bool> _replayAttendance() async {
  final storage = const FlutterSecureStorage();
  final repository = SyncApiRepository(
    ApiService(TokenStore(storage)),
    await MobileQueueRepository.open(),
    QueueSecretStore(storage),
  );
  await repository.replayPending();
  AppLogger.info('background_offline_replay_completed');
  return true;
}

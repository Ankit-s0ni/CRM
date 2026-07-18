import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hrms_attendance/features/sync/domain/sync_repository.dart';
import 'package:hrms_attendance/features/sync/presentation/sync_controller.dart';
import 'package:hrms_attendance/features/tracking/domain/tracking_repository.dart';
import 'package:hrms_attendance/features/tracking/presentation/tracking_controller.dart';

class TestTrackingController extends TrackingController {
  @override
  Future<TrackingViewState> build() async => _state(active: false);

  @override
  Future<bool> start() async {
    state = AsyncData(_state(active: true));
    return true;
  }

  @override
  Future<bool> stop({String reason = 'MANUAL'}) async {
    state = AsyncData(_state(active: false));
    return true;
  }

  @override
  Future<void> captureNow() async {}
}

class TestSyncController extends SyncController {
  @override
  Future<List<SyncQueueItem>> build() async => _pendingItems;

  @override
  Future<bool> syncNow({String? clientEventUuid}) async {
    final current = state.valueOrNull ?? _pendingItems;
    state = AsyncData(
      current
          .map(
            (item) => SyncQueueItem(
              clientEventUuid: item.clientEventUuid,
              eventType: item.eventType,
              status: 'SYNCED',
              createdAt: item.createdAt,
              attempts: item.attempts,
            ),
          )
          .toList(growable: false),
    );
    return true;
  }
}

TrackingViewState _state({required bool active}) {
  final now = DateTime.now();
  return TrackingViewState(
    session: active
        ? FieldTrackingSession(
            id: '00000000-0000-4000-8000-000000000001',
            deviceUuid: '00000000-0000-4000-8000-000000000002',
            clientStartUuid: '00000000-0000-4000-8000-000000000003',
            startedAt: now.subtract(const Duration(minutes: 18)),
            lastPingAt: now.subtract(const Duration(minutes: 1)),
          )
        : null,
    locationPermission: 'GRANTED',
    backgroundPermission: 'GRANTED',
    batteryLevel: 76,
    pingCount: active ? 4 : 0,
    lastPingAt: active ? now.subtract(const Duration(minutes: 1)) : null,
  );
}

final _pendingItems = [
  SyncQueueItem(
    clientEventUuid: '00000000-0000-4000-8000-000000000011',
    eventType: 'CHECKIN',
    status: 'PENDING',
    createdAt: DateTime(2026, 7, 17, 9, 12),
    attempts: 0,
  ),
  SyncQueueItem(
    clientEventUuid: '00000000-0000-4000-8000-000000000012',
    eventType: 'BREAK_START',
    status: 'RETRYABLE',
    createdAt: DateTime(2026, 7, 17, 13),
    attempts: 1,
    errorCode: 'SYNC_DEPENDENCY_UNAVAILABLE',
  ),
];

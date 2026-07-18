import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/network/network_providers.dart';
import '../../../core/storage/mobile_queue_repository.dart';
import '../../../core/storage/queue_secret_store.dart';
import '../data/attendance_offline_queue.dart';
import '../data/sync_api_repository.dart';
import '../domain/sync_repository.dart';

final mobileQueueRepositoryProvider = FutureProvider<MobileQueueRepository>(
  (ref) => MobileQueueRepository.open(),
);

final queueSecretStoreProvider = Provider<QueueSecretStore>(
  (ref) => const QueueSecretStore(FlutterSecureStorage()),
);

final attendanceOfflineQueueProvider = FutureProvider<AttendanceOfflineQueue>(
  (ref) async => AttendanceOfflineQueue(
    await ref.watch(mobileQueueRepositoryProvider.future),
    ref.watch(queueSecretStoreProvider),
  ),
);

final syncRepositoryProvider = FutureProvider<SyncRepository>((ref) async {
  return SyncApiRepository(
    ref.watch(apiServiceProvider),
    await ref.watch(mobileQueueRepositoryProvider.future),
    ref.watch(queueSecretStoreProvider),
  );
});

final syncControllerProvider =
    AsyncNotifierProvider<SyncController, List<SyncQueueItem>>(
      SyncController.new,
    );

class SyncController extends AsyncNotifier<List<SyncQueueItem>> {
  @override
  Future<List<SyncQueueItem>> build() async {
    final repository = await ref.watch(syncRepositoryProvider.future);
    final subscription = repository.watchItems().listen(
      (items) => state = AsyncData(items),
      onError: (Object error, StackTrace stack) =>
          state = AsyncError(error, stack),
    );
    ref.onDispose(subscription.cancel);
    return repository.items();
  }

  Future<bool> syncNow({String? clientEventUuid}) async {
    try {
      final repository = await ref.read(syncRepositoryProvider.future);
      await repository.replayPending(
        clientEventUuid: clientEventUuid,
        force: true,
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}

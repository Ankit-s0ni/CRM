import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/device/device_identity.dart';
import '../../../core/network/network_providers.dart';
import '../data/device_api_repository.dart';
import '../domain/device_repository.dart';

final deviceRepositoryProvider = Provider<DeviceRepository>(
  (ref) => DeviceApiRepository(
    ref.watch(apiServiceProvider),
    ref.watch(deviceIdentityProvider),
  ),
);
final deviceControllerProvider =
    AsyncNotifierProvider<DeviceController, Map<String, dynamic>?>(
      DeviceController.new,
    );

class DeviceController extends AsyncNotifier<Map<String, dynamic>?> {
  DeviceRepository get _repository => ref.read(deviceRepositoryProvider);
  @override
  Future<Map<String, dynamic>?> build() async {
    try {
      return _deviceFrom(await _repository.current());
    } catch (_) {
      return null;
    }
  }

  Future<bool> register() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final payload = await ref.read(deviceIdentityProvider).payload();
      await _repository.register(payload);
      return _deviceFrom(await _repository.current());
    });
    return !state.hasError;
  }

  Future<void> refreshCurrent() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () async => _deviceFrom(await _repository.current()),
    );
  }

  Future<bool> unregister() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _repository.unregister();
      return null;
    });
    return !state.hasError;
  }

  Map<String, dynamic>? _deviceFrom(Map<String, dynamic> response) {
    final data = response['data'];
    if (data is Map<String, dynamic>) return data;
    if (data is List) return data.whereType<Map<String, dynamic>>().firstOrNull;
    if (response['status'] != null) return response;
    return null;
  }
}

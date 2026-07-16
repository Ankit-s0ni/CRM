import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/device/device_identity.dart';
import '../../../core/network/network_providers.dart';
import '../data/device_api_repository.dart';
import '../domain/device_repository.dart';

final deviceRepositoryProvider = Provider<DeviceRepository>(
  (ref) => DeviceApiRepository(ref.watch(apiServiceProvider)),
);
final deviceIdentityProvider = Provider<DeviceIdentity>(
  (ref) => DeviceIdentity(const FlutterSecureStorage()),
);
final deviceControllerProvider = AsyncNotifierProvider<DeviceController, void>(
  DeviceController.new,
);

class DeviceController extends AsyncNotifier<void> {
  DeviceRepository get _repository => ref.read(deviceRepositoryProvider);
  @override
  Future<void> build() async {}
  Future<bool> register() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final payload = await ref.read(deviceIdentityProvider).payload();
      await _repository.register(payload);
    });
    return !state.hasError;
  }
}

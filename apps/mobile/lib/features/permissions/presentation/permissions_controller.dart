import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/platform_capability_repository.dart';
import '../domain/app_capability.dart';
import '../domain/capability_repository.dart';

final capabilityRepositoryProvider = Provider<CapabilityRepository>(
  (ref) => PlatformCapabilityRepository(),
);
final permissionsControllerProvider =
    AsyncNotifierProvider<PermissionsController, CapabilitySnapshot>(
      PermissionsController.new,
    );

class PermissionsController extends AsyncNotifier<CapabilitySnapshot> {
  CapabilityRepository get _repository =>
      ref.read(capabilityRepositoryProvider);
  @override
  Future<CapabilitySnapshot> build() => _repository.inspect();

  Future<void> request(AppCapability capability) async {
    state = const AsyncLoading<CapabilitySnapshot>().copyWithPrevious(state);
    state = await AsyncValue.guard(() => _repository.request(capability));
  }

  Future<void> refresh() async {
    state = await AsyncValue.guard(_repository.inspect);
  }

  Future<bool> openSettings() => _repository.openSettings();
}

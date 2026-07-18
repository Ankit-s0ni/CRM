import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_config.dart';
import '../../../core/device/device_identity.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/tenant/tenant_controller.dart';
import '../data/auth_api_repository.dart';
import '../data/local_auth_repository.dart';
import '../domain/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AppConfig.localMode
      ? const LocalAuthRepository()
      : AuthApiRepository(
          ref.watch(apiServiceProvider),
          ref.watch(deviceIdentityProvider),
        ),
);
final authControllerProvider = AsyncNotifierProvider<AuthController, void>(
  AuthController.new,
);

class AuthController extends AsyncNotifier<void> {
  AuthRepository get _repository => ref.read(authRepositoryProvider);
  @override
  Future<void> build() async {}
  Future<bool> login(String identifier, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _repository.login(identifier, password);
      // A newly authenticated identity must never inherit another employee's
      // cached workspace projection when bootstrap is unavailable.
      await ref
          .read(tenantControllerProvider.notifier)
          .loadRuntime(allowCachedFallback: false);
    });
    if (state.hasError) {
      await ref.read(apiServiceProvider).clearSession();
      await ref.read(tenantControllerProvider.notifier).clearRuntime();
    }
    return !state.hasError;
  }

  Future<void> logout() async {
    try {
      await _repository.logout();
    } finally {
      await ref.read(tenantControllerProvider.notifier).clearRuntime();
    }
  }
}

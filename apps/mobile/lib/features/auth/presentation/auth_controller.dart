import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_config.dart';
import '../../../core/network/network_providers.dart';
import '../data/auth_api_repository.dart';
import '../data/local_auth_repository.dart';
import '../domain/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AppConfig.localMode
      ? const LocalAuthRepository()
      : AuthApiRepository(ref.watch(apiServiceProvider)),
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
    state = await AsyncValue.guard(
      () => _repository.login(identifier, password),
    );
    return !state.hasError;
  }

  Future<void> logout() async {
    await _repository.logout();
    await ref.read(tokenStoreProvider).clear();
  }
}

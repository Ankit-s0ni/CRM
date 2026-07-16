import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/network_providers.dart';
import '../data/consent_api_repository.dart';
import '../domain/consent_repository.dart';

final consentRepositoryProvider = Provider<ConsentRepository>(
  (ref) => ConsentApiRepository(ref.watch(apiServiceProvider)),
);
final consentControllerProvider =
    AsyncNotifierProvider<ConsentController, void>(ConsentController.new);

class ConsentController extends AsyncNotifier<void> {
  ConsentRepository get _repository => ref.read(consentRepositoryProvider);
  @override
  Future<void> build() async {}
  Future<bool> accept() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repository.accept('1.2'));
    return !state.hasError;
  }

  Future<void> withdraw() => _repository.withdraw();
}

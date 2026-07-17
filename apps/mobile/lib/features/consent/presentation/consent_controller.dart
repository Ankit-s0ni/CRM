import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/network_providers.dart';
import '../data/consent_api_repository.dart';
import '../domain/consent_repository.dart';

final consentRepositoryProvider = Provider<ConsentRepository>(
  (ref) => ConsentApiRepository(ref.watch(apiServiceProvider)),
);
final consentControllerProvider =
    AsyncNotifierProvider<ConsentController, Map<String, dynamic>?>(
      ConsentController.new,
    );

class ConsentController extends AsyncNotifier<Map<String, dynamic>?> {
  ConsentRepository get _repository => ref.read(consentRepositoryProvider);
  @override
  Future<Map<String, dynamic>?> build() => _repository.current();

  Future<bool> accept() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _repository.accept('1.2');
      return _repository.current();
    });
    return !state.hasError;
  }

  Future<bool> withdraw() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await _repository.withdraw();
      return null;
    });
    return !state.hasError;
  }
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/network_providers.dart';
import '../data/enrollment_api_repository.dart';
import '../domain/enrollment_repository.dart';

final enrollmentRepositoryProvider = Provider<EnrollmentRepository>(
  (ref) => EnrollmentApiRepository(ref.watch(apiServiceProvider)),
);
final enrollmentControllerProvider =
    AsyncNotifierProvider<EnrollmentController, void>(EnrollmentController.new);

class EnrollmentController extends AsyncNotifier<void> {
  EnrollmentRepository get _repository =>
      ref.read(enrollmentRepositoryProvider);
  @override
  Future<void> build() async {}
  Future<bool> complete(String key, String proof) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repository.complete(key, proof));
    return !state.hasError;
  }
}

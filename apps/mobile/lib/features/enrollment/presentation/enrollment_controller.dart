import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/network_providers.dart';
import '../data/enrollment_api_repository.dart';
import '../domain/enrollment_repository.dart';

final enrollmentRepositoryProvider = Provider<EnrollmentRepository>(
  (ref) => EnrollmentApiRepository(ref.watch(apiServiceProvider)),
);
final enrollmentControllerProvider =
    AsyncNotifierProvider<EnrollmentController, Map<String, dynamic>>(
      EnrollmentController.new,
    );

class EnrollmentController extends AsyncNotifier<Map<String, dynamic>> {
  EnrollmentRepository get _repository =>
      ref.read(enrollmentRepositoryProvider);
  @override
  Future<Map<String, dynamic>> build() => _repository.status();

  Future<bool> enroll(String filePath) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      try {
        await _repository.enroll(filePath);
        return await _repository.status();
      } finally {
        final file = File(filePath);
        if (await file.exists()) await file.delete();
      }
    });
    return !state.hasError;
  }
}

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/network_providers.dart';
import '../data/profile_api_repository.dart';
import '../domain/profile_repository.dart';

final profileRepositoryProvider = Provider<ProfileRepository>(
  (ref) => ProfileApiRepository(ref.watch(apiServiceProvider)),
);

final profileControllerProvider = FutureProvider<Map<String, dynamic>>(
  (ref) => ref.read(profileRepositoryProvider).load(),
);

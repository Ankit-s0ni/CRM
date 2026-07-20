import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/network_providers.dart';
import '../../../core/tenant/tenant_controller.dart';
import '../data/profile_api_repository.dart';
import '../domain/profile_repository.dart';

final profileRepositoryProvider = Provider<ProfileRepository>(
  (ref) => ProfileApiRepository(ref.watch(apiServiceProvider)),
);

final profileControllerProvider = FutureProvider<Map<String, dynamic>>((ref) {
  // Make the cache identity-aware even if a caller changes sessions without
  // rebuilding the navigation shell.
  final identity = ref.watch(
    tenantControllerProvider.select(
      (tenant) => (tenant.tenantId, tenant.employeeId),
    ),
  );
  if (identity.$1.isEmpty || identity.$2.isEmpty) {
    return <String, dynamic>{};
  }
  return ref.read(profileRepositoryProvider).load();
});

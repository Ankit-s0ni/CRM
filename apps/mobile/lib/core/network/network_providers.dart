import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../device/device_identity.dart';
import 'api_service.dart';
import 'generated/mobile_api_clients.g.dart';
import 'token_store.dart';

final tokenStoreProvider = Provider<TokenStore>(
  (ref) => TokenStore(const FlutterSecureStorage()),
);
final apiServiceProvider = Provider<ApiService>(
  (ref) => ApiService(
    ref.watch(tokenStoreProvider),
    deviceIdentity: ref.watch(deviceIdentityProvider),
  ),
);
final platformApiClientProvider = Provider<GeneratedPlatformApiClient>(
  (ref) => GeneratedPlatformApiClient(ref.watch(apiServiceProvider)),
);
final hrmsApiClientProvider = Provider<GeneratedHrmsApiClient>(
  (ref) => GeneratedHrmsApiClient(ref.watch(apiServiceProvider)),
);

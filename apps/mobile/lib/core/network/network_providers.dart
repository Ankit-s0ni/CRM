import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';
import 'token_store.dart';

final tokenStoreProvider = Provider<TokenStore>(
  (ref) => TokenStore(const FlutterSecureStorage()),
);
final apiServiceProvider = Provider<ApiService>(
  (ref) => ApiService(ref.watch(tokenStoreProvider)),
);

import 'package:flutter/foundation.dart';

class IntegrityTokenProvider {
  const IntegrityTokenProvider();

  Future<String> token() async {
    if (kReleaseMode) throw const IntegrityProviderUnavailable();
    // Debug tokens are accepted only by non-production API environments.
    return 'dev-integrity-ok';
  }
}

class IntegrityProviderUnavailable implements Exception {
  const IntegrityProviderUnavailable();
}

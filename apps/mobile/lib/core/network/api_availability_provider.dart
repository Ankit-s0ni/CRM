import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_availability.dart';
import 'network_providers.dart';

final apiAvailabilityProvider = StreamProvider<ApiAvailabilityEvent>((ref) {
  return ref.watch(apiServiceProvider).availability;
});

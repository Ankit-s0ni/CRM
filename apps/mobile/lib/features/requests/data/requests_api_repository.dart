import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../../../core/network/network_providers.dart';
import '../domain/requests_repository.dart';

final requestsRepositoryProvider = Provider<RequestsRepository>(
  (ref) => RequestsApiRepository(ref.watch(apiServiceProvider)),
);

class RequestsApiRepository implements RequestsRepository {
  RequestsApiRepository(this._api);
  final ApiService _api;
  @override
  Future<void> createRegularization(Map<String, dynamic> request) async =>
      _api.post(ApiRoutes.regularizations, data: request);
  @override
  Future<List<Map<String, dynamic>>> mine() async {
    final response = await _api.get<Map<String, dynamic>>(
      ApiRoutes.myRegularizations,
    );
    return (response.data?['data'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);
  }

  @override
  Future<void> cancel(String id) async =>
      _api.post(ApiRoutes.cancelRegularization(id));
}

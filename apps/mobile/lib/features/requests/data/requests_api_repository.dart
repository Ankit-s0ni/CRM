import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/requests_repository.dart';

class RequestsApiRepository implements RequestsRepository {
  RequestsApiRepository(this._api);
  final ApiService _api;
  @override
  Future<void> createRegularization(Map<String, dynamic> request) async =>
      _api.post(ApiRoutes.regularizations, data: request);
  @override
  Future<List<Map<String, dynamic>>> mine() async =>
      (await _api.get<List<dynamic>>(
        ApiRoutes.myRegularizations,
      )).data?.cast<Map<String, dynamic>>() ??
      [];
}

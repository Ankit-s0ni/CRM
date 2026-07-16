import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/security_repository.dart';

class SecurityApiRepository implements SecurityRepository {
  SecurityApiRepository(this._api);
  final ApiService _api;
  @override
  Future<List<Map<String, dynamic>>> verificationLogs() async =>
      (await _api.get<List<dynamic>>(
        ApiRoutes.verificationLogs,
      )).data?.cast<Map<String, dynamic>>() ??
      [];
}

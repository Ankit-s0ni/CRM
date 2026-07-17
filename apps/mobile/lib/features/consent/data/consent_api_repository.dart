import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/consent_repository.dart';

class ConsentApiRepository implements ConsentRepository {
  ConsentApiRepository(this._api);
  final ApiService _api;
  @override
  Future<Map<String, dynamic>?> current() async {
    final response = await _api.get<Map<String, dynamic>>(ApiRoutes.myConsent);
    final data = response.data?['data'];
    return data is Map<String, dynamic> ? data : null;
  }

  @override
  Future<void> accept(String policyVersion) async => _api.post(
    ApiRoutes.biometricConsents,
    data: {'policyVersion': policyVersion, 'accepted': true},
  );
  @override
  Future<void> withdraw() async => _api.delete(ApiRoutes.myConsent);
}

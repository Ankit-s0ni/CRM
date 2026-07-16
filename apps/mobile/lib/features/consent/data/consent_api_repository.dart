import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/consent_repository.dart';

class ConsentApiRepository implements ConsentRepository {
  ConsentApiRepository(this._api);
  final ApiService _api;
  @override
  Future<void> accept(String policyVersion) async => _api.post(
    ApiRoutes.biometricConsents,
    data: {'policyVersion': policyVersion, 'accepted': true},
  );
  @override
  Future<void> withdraw() async => _api.delete(ApiRoutes.myConsent);
}

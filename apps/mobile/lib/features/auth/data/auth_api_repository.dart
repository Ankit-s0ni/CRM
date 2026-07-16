import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/auth_repository.dart';

class AuthApiRepository implements AuthRepository {
  AuthApiRepository(this._api);
  final ApiService _api;
  @override
  Future<void> login(String identifier, String password) async => _api.post(
    ApiRoutes.login,
    data: {'identifier': identifier, 'password': password},
  );
  @override
  Future<void> logout() async => _api.post(ApiRoutes.logout);
}

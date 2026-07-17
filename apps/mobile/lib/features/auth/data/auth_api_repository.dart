import '../../../core/device/device_identity.dart';
import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/auth_repository.dart';

class AuthApiRepository implements AuthRepository {
  AuthApiRepository(this._api, this._identity);
  final ApiService _api;
  final DeviceIdentity _identity;
  @override
  Future<void> login(String identifier, String password) async {
    final identity = await _identity.payload();
    final response = await _api.post<Map<String, dynamic>>(
      ApiRoutes.login,
      data: {
        'email': identifier.trim().toLowerCase(),
        'password': password,
        'deviceUuid': identity['deviceUuid'],
      },
    );
    await _api.establishSession(response.data ?? const {});
  }

  @override
  Future<void> logout() async {
    final refreshToken = await _api.refreshToken();
    if (refreshToken != null) {
      await _api.post(ApiRoutes.logout, data: {'refreshToken': refreshToken});
    }
    await _api.clearSession();
  }
}

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
    _api.beginWorkspaceDiscovery();
    final identity = await _identity.payload();
    final response = await _api.post<Map<String, dynamic>>(
      ApiRoutes.mobileLogin,
      data: {
        'email': identifier.trim().toLowerCase(),
        'password': password,
        'deviceUuid': identity['deviceUuid'],
      },
    );
    final session = response.data ?? const <String, dynamic>{};
    final user = session['user'];
    final workspace = user is Map<String, dynamic> ? user['workspace'] : null;
    if (workspace is! String || workspace.isEmpty) {
      throw const FormatException('The workspace could not be resolved.');
    }
    await _api.selectWorkspace(workspace);
    await _api.establishSession(session);
  }

  @override
  Future<void> logout() async {
    try {
      final refreshToken = await _api.refreshToken();
      if (refreshToken != null) {
        await _api.post(ApiRoutes.logout, data: {'refreshToken': refreshToken});
      }
    } finally {
      await _api.clearSession();
    }
  }
}

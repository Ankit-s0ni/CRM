import '../../../core/network/api_routes.dart';
import '../../../core/network/authority_clients.dart';
import '../domain/settings_repository.dart';

class SettingsApiRepository implements SettingsRepository {
  SettingsApiRepository(this._api);
  final HrmsApiClient _api;
  @override
  Future<void> updatePreferences(Map<String, dynamic> preferences) async =>
      _api.patch(ApiRoutes.preferences, data: preferences);
}

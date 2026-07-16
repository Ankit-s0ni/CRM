import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/profile_repository.dart';

class ProfileApiRepository implements ProfileRepository {
  ProfileApiRepository(this._api);
  final ApiService _api;
  @override
  Future<Map<String, dynamic>> load() async =>
      (await _api.get<Map<String, dynamic>>(ApiRoutes.profile)).data ?? {};
}

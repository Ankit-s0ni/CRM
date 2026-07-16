import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/sync_repository.dart';

class SyncApiRepository implements SyncRepository {
  SyncApiRepository(this._api);
  final ApiService _api;
  @override
  Future<void> replayPending() async => _api.post(ApiRoutes.offlineSync);
}

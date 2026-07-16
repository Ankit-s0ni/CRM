import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/tracking_repository.dart';

class TrackingApiRepository implements TrackingRepository {
  TrackingApiRepository(this._api);
  final ApiService _api;
  @override
  Future<void> start() async => _api.post(ApiRoutes.fieldSessions);
  @override
  Future<void> stop() async =>
      _api.patch(ApiRoutes.fieldSessions, data: {'status': 'STOPPED'});
  @override
  Future<void> sendPing(double latitude, double longitude) async => _api.post(
    ApiRoutes.fieldPings,
    data: {'latitude': latitude, 'longitude': longitude},
  );
}

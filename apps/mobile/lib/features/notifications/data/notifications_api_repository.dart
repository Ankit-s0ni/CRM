import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/notifications_repository.dart';

class NotificationsApiRepository implements NotificationsRepository {
  NotificationsApiRepository(this._api);
  final ApiService _api;
  @override
  Future<List<Map<String, dynamic>>> list() async =>
      (await _api.get<List<dynamic>>(
        ApiRoutes.notifications,
      )).data?.cast<Map<String, dynamic>>() ??
      [];
  @override
  Future<void> markAllRead() async => _api.post(ApiRoutes.notificationReadAll);
}

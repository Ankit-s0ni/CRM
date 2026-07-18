import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../../../core/network/network_providers.dart';
import '../domain/notifications_repository.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>(
  (ref) => NotificationsApiRepository(ref.watch(apiServiceProvider)),
);

class NotificationsApiRepository implements NotificationsRepository {
  NotificationsApiRepository(this._api);
  final ApiService _api;
  @override
  Future<List<Map<String, dynamic>>> list() async {
    final response = await _api.get<Map<String, dynamic>>(
      ApiRoutes.notifications,
    );
    return (response.data?['data'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);
  }

  @override
  Future<void> markRead(String id) async =>
      _api.post(ApiRoutes.markNotificationRead(id));
  @override
  Future<void> markAllRead() async => _api.post(ApiRoutes.notificationReadAll);
}

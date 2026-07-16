abstract interface class NotificationsRepository {
  Future<List<Map<String, dynamic>>> list();
  Future<void> markAllRead();
}

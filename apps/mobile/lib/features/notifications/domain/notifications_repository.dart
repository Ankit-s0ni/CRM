abstract interface class NotificationsRepository {
  Future<List<Map<String, dynamic>>> list();
  Future<void> markRead(String id);
  Future<void> markAllRead();
}

abstract interface class SettingsRepository {
  Future<void> updatePreferences(Map<String, dynamic> preferences);
}

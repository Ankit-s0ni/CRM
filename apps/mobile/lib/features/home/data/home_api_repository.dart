import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/home_repository.dart';
import '../domain/home_summary.dart';

class HomeApiRepository implements HomeRepository {
  HomeApiRepository(this._api);
  final ApiService _api;

  @override
  Future<HomeSummary> loadToday() async {
    final profile = await _api.get<Map<String, dynamic>>(ApiRoutes.profile);
    final day = await _api.get<Map<String, dynamic>>(
      ApiRoutes.attendanceDay(
        DateTime.now().toIso8601String().split('T').first,
      ),
    );
    return HomeSummary(
      employeeName: profile.data?['name'] as String? ?? 'Employee',
      dateLabel: day.data?['dateLabel'] as String? ?? 'Today',
      shiftLabel: day.data?['shiftLabel'] as String? ?? 'Shift not assigned',
      locationLabel:
          day.data?['locationLabel'] as String? ?? 'Location unavailable',
      isInsideZone: day.data?['insideZone'] as bool? ?? false,
      isCheckedIn: day.data?['checkedIn'] as bool? ?? false,
    );
  }
}

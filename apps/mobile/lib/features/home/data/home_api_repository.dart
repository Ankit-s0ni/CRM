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
    final day = await _api.get<Map<String, dynamic>>(ApiRoutes.attendanceToday);
    final profileData = profile.data?['data'] as Map<String, dynamic>? ?? {};
    final dayData = day.data?['data'] as Map<String, dynamic>? ?? {};
    final shift = dayData['shift'] as Map<String, dynamic>?;
    return HomeSummary(
      employeeName: profileData['fullName'] as String? ?? 'Employee',
      employeeCode: profileData['employeeCode'] as String? ?? '',
      department:
          (profileData['department'] as Map<String, dynamic>?)?['name']
              as String? ??
          '',
      managerName:
          (profileData['manager'] as Map<String, dynamic>?)?['fullName']
              as String? ??
          '',
      dateLabel: dayData['attendanceDate'] as String? ?? 'Today',
      shiftLabel: shift?['name'] as String? ?? 'Shift not assigned',
      locationLabel: dayData['timezone'] as String? ?? 'Location unavailable',
      isInsideZone: false,
      isCheckedIn: dayData['openAction'] != 'CHECKIN',
    );
  }
}

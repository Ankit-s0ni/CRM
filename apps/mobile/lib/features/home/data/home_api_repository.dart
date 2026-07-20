import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import 'package:intl/intl.dart';
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
    final policy = dayData['policy'] as Map<String, dynamic>?;
    final workplace = dayData['workplace'] as Map<String, dynamic>?;
    final overview = dayData['workOverview'] as Map<String, dynamic>?;
    final nextHoliday = dayData['nextHoliday'] as Map<String, dynamic>?;
    final officeAssignments =
        profileData['officeAssignments'] as List<dynamic>? ?? const [];
    final profileOffice = officeAssignments
        .whereType<Map<String, dynamic>>()
        .map((assignment) => assignment['office'])
        .whereType<Map<String, dynamic>>()
        .firstOrNull;
    final shiftLabel = _shiftLabel(shift);
    final locationMode = policy?['locationMode'] as String? ?? 'NONE';
    final selfieMode = policy?['selfieMode'] as String? ?? 'DISABLED';
    final attendanceDate = dayData['attendanceDate'] as String?;
    return HomeSummary(
      employeeName: profileData['fullName'] as String? ?? '',
      employeeCode: profileData['employeeCode'] as String? ?? '',
      department:
          (profileData['department'] as Map<String, dynamic>?)?['name']
              as String? ??
          '',
      managerName:
          (profileData['manager'] as Map<String, dynamic>?)?['fullName']
              as String? ??
          '',
      officeName:
          workplace?['name'] as String? ??
          profileOffice?['officeName'] as String? ??
          '',
      dateLabel: _dateLabel(attendanceDate),
      shiftLabel: shiftLabel,
      locationLabel: _workplaceLabel(workplace, locationMode),
      isInsideZone: null,
      isCheckedIn: dayData['openAction'] != 'CHECKIN',
      workOverview: overview == null
          ? null
          : HomeWorkOverview(
              workMinutes: (overview['workMinutes'] as num?)?.toInt() ?? 0,
              targetMinutes: (overview['targetMinutes'] as num?)?.toInt() ?? 0,
              lateMinutes: (overview['lateMinutes'] as num?)?.toInt() ?? 0,
              overtimeMinutes:
                  (overview['overtimeMinutes'] as num?)?.toInt() ?? 0,
            ),
      policy: policy == null
          ? null
          : HomePolicySnapshot(
              name: policy['name'] as String? ?? 'Policy unavailable',
              workMode: _title(profileData['workType'] as String?),
              shift: shiftLabel,
              locationRule: _locationRule(locationMode, workplace),
              selfieRule: selfieMode == 'REQUIRED'
                  ? 'Required'
                  : 'Not required',
              deviceRule: policy['requireRegisteredDevice'] == true
                  ? 'Registered device required'
                  : 'Any approved device',
              nextHoliday: _holidayLabel(nextHoliday),
            ),
      timeline: (dayData['timeline'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(_timelineEvent)
          .whereType<HomeTimelineEvent>()
          .toList(growable: false),
    );
  }
}

String _shiftLabel(Map<String, dynamic>? shift) {
  if (shift == null) return 'Shift not assigned';
  final name = shift['name'] as String? ?? 'Assigned shift';
  final start = shift['startTime'] as String?;
  final end = shift['endTime'] as String?;
  return start == null || end == null ? name : '$name · $start–$end';
}

String _dateLabel(String? value) {
  final date = value == null ? null : DateTime.tryParse(value);
  return date == null ? 'Today' : DateFormat('EEEE, d MMMM').format(date);
}

String _workplaceLabel(Map<String, dynamic>? workplace, String locationMode) {
  if (locationMode == 'NONE') return 'Location verification not required';
  if (locationMode == 'FIELD_GPS') return 'Field location verification';
  if (workplace == null) return 'Office not assigned';
  final name = workplace['name'] as String? ?? 'Assigned office';
  final radius = (workplace['radiusMeters'] as num?)?.toInt();
  return radius == null ? name : '$name · ${radius}m zone';
}

String _locationRule(
  String locationMode,
  Map<String, dynamic>? workplace,
) => switch (locationMode) {
  'OFFICE_GEOFENCE' =>
    workplace == null
        ? 'Office geofence'
        : 'Office geofence · ${(workplace['radiusMeters'] as num?)?.toInt() ?? 0}m',
  'FIELD_GPS' => 'Field GPS',
  _ => 'Not required',
};

String _title(String? value) {
  if (value == null || value.isEmpty) return 'Employee';
  final lower = value.toLowerCase();
  return '${lower[0].toUpperCase()}${lower.substring(1)}';
}

String? _holidayLabel(Map<String, dynamic>? holiday) {
  if (holiday == null) return null;
  final name = holiday['name'] as String?;
  final date = DateTime.tryParse(holiday['date'] as String? ?? '');
  if (name == null || date == null) return null;
  return '$name · ${DateFormat('d MMMM').format(date)}';
}

HomeTimelineEvent? _timelineEvent(Map<String, dynamic> raw) {
  final type = raw['eventType'] as String?;
  final occurredAt = DateTime.tryParse(raw['eventTime'] as String? ?? '');
  return type == null || occurredAt == null
      ? null
      : HomeTimelineEvent(type: type, occurredAt: occurredAt.toLocal());
}

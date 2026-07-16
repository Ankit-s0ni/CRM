import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/attendance_repository.dart';

class AttendanceApiRepository implements AttendanceRepository {
  AttendanceApiRepository(this._api);
  final ApiService _api;
  @override
  Future<void> punch(Map<String, dynamic> payload) async =>
      _api.post(ApiRoutes.punches, data: payload);
  @override
  Future<void> toggleBreak(String action) async =>
      _api.post(ApiRoutes.breaks, data: {'action': action});
  @override
  Future<List<Map<String, dynamic>>> history({String? month}) async =>
      (await _api.get<List<dynamic>>(
        ApiRoutes.attendanceHistory,
        query: {'month': month},
      )).data?.cast<Map<String, dynamic>>() ??
      [];
  @override
  Future<Map<String, dynamic>> day(String date) async =>
      (await _api.get<Map<String, dynamic>>(
        ApiRoutes.attendanceDay(date),
      )).data ??
      {};
}

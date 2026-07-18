import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../../../core/network/network_providers.dart';
import '../domain/leave_repository.dart';

final leaveRepositoryProvider = Provider<LeaveRepository>(
  (ref) => LeaveApiRepository(ref.watch(apiServiceProvider)),
);

class LeaveApiRepository implements LeaveRepository {
  LeaveApiRepository(this._api);

  final ApiService _api;

  @override
  Future<List<Map<String, dynamic>>> balances() async =>
      _data(await _api.get<Map<String, dynamic>>(ApiRoutes.myLeaveBalances));

  @override
  Future<List<Map<String, dynamic>>> policies() async =>
      _data(await _api.get<Map<String, dynamic>>(ApiRoutes.leavePolicies));

  @override
  Future<List<Map<String, dynamic>>> requests() async =>
      _data(await _api.get<Map<String, dynamic>>(ApiRoutes.leaveRequests));

  @override
  Future<void> createRequest(Map<String, dynamic> request) async =>
      _api.post(ApiRoutes.leaveRequests, data: request);

  @override
  Future<void> cancel(String id) async =>
      _api.post(ApiRoutes.cancelLeaveRequest(id));

  List<Map<String, dynamic>> _data(dynamic response) =>
      (response.data?['data'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .toList(growable: false);
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/config/app_config.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/tenant/tenant_controller.dart';
import '../data/home_api_repository.dart';
import '../domain/home_repository.dart';
import '../domain/home_summary.dart';

final homeRepositoryProvider = Provider<HomeRepository>(
  (ref) => HomeApiRepository(ref.watch(apiServiceProvider)),
);

final homeControllerProvider =
    AsyncNotifierProvider<HomeController, HomeSummary>(HomeController.new);

class HomeController extends AsyncNotifier<HomeSummary> {
  HomeRepository get _repository => ref.read(homeRepositoryProvider);

  @override
  Future<HomeSummary> build() async {
    if (!AppConfig.localMode) return _repository.loadToday();
    final tenant = ref.watch(tenantControllerProvider);
    final policy = tenant.attendancePolicy;
    String time(TimeOfDay value) =>
        '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
    return HomeSummary(
      employeeName: 'Salim Al Harthy',
      dateLabel: DateFormat(
        'EEEE, d MMMM',
        tenant.locale.languageCode,
      ).format(DateTime.now()),
      shiftLabel: (() {
        final name = policy.name;
        final formattedTime = '${time(policy.shiftStart)}–${time(policy.shiftEnd)}';
        final dashTime = '${time(policy.shiftStart)}-${time(policy.shiftEnd)}';
        
        if (name.contains(formattedTime) || name.contains(dashTime)) {
          return name;
        }
        return '$name · $formattedTime';
      })(),
      locationLabel:
          'Muscat Logistics Hub · ${policy.geofenceRadiusMeters}m zone',
      isInsideZone: true,
      isCheckedIn: false,
      employeeCode: 'DEMO-001',
      department: 'Operations',
      managerName: 'Demo Manager',
      officeName: 'Muscat Logistics Hub',
      workOverview: const HomeWorkOverview(
        workMinutes: 1890,
        targetMinutes: 2400,
        lateMinutes: 4,
        overtimeMinutes: 42,
      ),
      policy: HomePolicySnapshot(
        name: policy.name,
        workMode: 'Hybrid',
        shift: '${time(policy.shiftStart)}–${time(policy.shiftEnd)}',
        locationRule: '${policy.geofenceRadiusMeters}m office geofence',
        selfieRule: policy.requiresFace ? 'Required' : 'Not required',
        deviceRule: policy.requiresRegisteredDevice
            ? 'Registered device required'
            : 'Any device',
        nextHoliday: null,
      ),
      timeline: const [],
    );
  }

  Future<void> refresh() async {
    if (AppConfig.localMode) {
      await Future<void>.delayed(const Duration(milliseconds: 350));
      return;
    }
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repository.loadToday);
  }
}

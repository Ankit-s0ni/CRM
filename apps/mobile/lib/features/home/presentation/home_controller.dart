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
      shiftLabel:
          '${policy.name} · ${time(policy.shiftStart)}–${time(policy.shiftEnd)}',
      locationLabel:
          'Muscat Logistics Hub · ${policy.geofenceRadiusMeters}m zone',
      isInsideZone: true,
      isCheckedIn: false,
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

import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/features/home/data/home_api_repository.dart';

import 'support/test_api_service.dart';

void main() {
  test('home cards project authenticated API data without demo defaults', () async {
    final summary = await HomeApiRepository(createTestApiService()).loadToday();

    expect(summary.employeeName, 'Priya Sharma');
    expect(summary.shiftLabel, 'Day Shift · 09:00–18:00');
    expect(summary.locationLabel, 'Muscat Corporate Office · 150m zone');
    expect(summary.workOverview?.workMinutes, 1890);
    expect(summary.workOverview?.targetMinutes, 2400);
    expect(summary.workOverview?.lateMinutes, 12);
    expect(summary.workOverview?.overtimeMinutes, 45);
    expect(summary.policy?.name, 'Muscat Office Policy');
    expect(summary.policy?.locationRule, 'Office geofence · 150m');
    expect(summary.policy?.selfieRule, 'Not required');
    expect(summary.policy?.deviceRule, 'Registered device required');
    expect(summary.policy?.nextHoliday, 'Renaissance Day · 23 July');
    expect(summary.timeline.single.type, 'CHECKIN');
  });
}

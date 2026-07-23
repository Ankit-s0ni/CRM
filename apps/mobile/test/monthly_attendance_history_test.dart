import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/features/attendance/domain/monthly_attendance_history.dart';

void main() {
  group('MonthlyAttendanceHistory', () {
    test('parses the complete API calendar and summary', () {
      final history = MonthlyAttendanceHistory.fromJson({
        'calendar': {
          'month': '2026-07',
          'timezone': 'Asia/Muscat',
          'days': [
            {
              'date': '2026-07-01',
              'status': 'PRESENT',
              'isWorkingDay': true,
              'isToday': false,
              'isFuture': false,
              'isLocked': false,
              'canOpenDetails': true,
              'totalWorkMinutes': 480,
              'lateMinutes': 0,
              'overtimeMinutes': 0,
            },
            {
              'date': '2026-07-02',
              'status': 'LATE',
              'isWorkingDay': true,
              'isToday': false,
              'isFuture': false,
              'isLocked': false,
              'canOpenDetails': true,
              'totalWorkMinutes': 450,
              'lateMinutes': 15,
              'overtimeMinutes': 0,
            },
            {
              'date': '2026-07-03',
              'status': 'WEEKLY_OFF',
              'isWorkingDay': false,
              'isToday': false,
              'isFuture': false,
              'isLocked': false,
              'canOpenDetails': false,
              'totalWorkMinutes': 0,
              'lateMinutes': 0,
              'overtimeMinutes': 0,
            },
          ],
        },
        'summary': {
          'present': 1,
          'lateDays': 1,
          'absent': 0,
          'leaveDays': 0,
          'weeklyOffs': 1,
          'workMinutes': 930,
        },
      }, requestedMonth: '2026-07');

      expect(history.month, '2026-07');
      expect(history.timezone, 'Asia/Muscat');
      expect(history.days, hasLength(3));
      expect(history.days.last.status, 'WEEKLY_OFF');
      expect(history.days.last.canOpenDetails, isFalse);
      expect(history.summary.present, 1);
      expect(history.summary.lateDays, 1);
      expect(history.summary.weeklyOffs, 1);
      expect(history.summary.workMinutes, 930);
    });

    test('supports the former sparse response while clients are upgraded', () {
      final history = MonthlyAttendanceHistory.fromJson({
        'data': [
          {
            'attendanceDate': '2026-07-10',
            'attendanceStatus': 'PRESENT',
            'lateMinutes': 8,
            'totalWorkMinutes': 472,
          },
        ],
      }, requestedMonth: '2026-07');

      expect(history.days.single.status, 'LATE');
      expect(history.summary.lateDays, 1);
      expect(history.summary.workMinutes, 472);
    });
  });
}

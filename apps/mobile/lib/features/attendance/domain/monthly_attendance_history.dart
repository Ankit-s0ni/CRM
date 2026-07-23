class MonthlyAttendanceHistory {
  const MonthlyAttendanceHistory({
    required this.month,
    required this.timezone,
    required this.days,
    required this.summary,
  });

  final String month;
  final String timezone;
  final List<AttendanceCalendarDay> days;
  final AttendanceMonthSummary summary;

  factory MonthlyAttendanceHistory.fromJson(
    Map<String, dynamic> json, {
    required String requestedMonth,
  }) {
    final calendar =
        json['calendar'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    final rawDays =
        calendar['days'] as List<dynamic>? ??
        json['data'] as List<dynamic>? ??
        const [];
    final days = rawDays
        .whereType<Map<String, dynamic>>()
        .map(AttendanceCalendarDay.fromJson)
        .toList(growable: false);
    return MonthlyAttendanceHistory(
      month: calendar['month'] as String? ?? requestedMonth,
      timezone: calendar['timezone'] as String? ?? 'UTC',
      days: days,
      summary: AttendanceMonthSummary.fromJson(
        json['summary'] as Map<String, dynamic>? ?? const {},
        days,
      ),
    );
  }

  static MonthlyAttendanceHistory empty(String month) =>
      MonthlyAttendanceHistory(
        month: month,
        timezone: 'UTC',
        days: const [],
        summary: const AttendanceMonthSummary(),
      );
}

class AttendanceCalendarDay {
  const AttendanceCalendarDay({
    required this.date,
    required this.status,
    required this.isWorkingDay,
    required this.isToday,
    required this.isFuture,
    required this.isLocked,
    required this.canOpenDetails,
    required this.totalWorkMinutes,
    required this.lateMinutes,
    required this.overtimeMinutes,
    this.label,
  });

  final String date;
  final String status;
  final bool isWorkingDay;
  final bool isToday;
  final bool isFuture;
  final bool isLocked;
  final bool canOpenDetails;
  final int totalWorkMinutes;
  final int lateMinutes;
  final int overtimeMinutes;
  final String? label;

  int get day => DateTime.tryParse(date)?.day ?? 0;
  bool get isApplicable => status != 'NOT_APPLICABLE';

  factory AttendanceCalendarDay.fromJson(Map<String, dynamic> json) {
    final date =
        json['date'] as String? ?? json['attendanceDate'] as String? ?? '';
    final rawStatus =
        json['status'] as String? ??
        json['attendanceStatus'] as String? ??
        'WORKING_DAY';
    final lateMinutes = (json['lateMinutes'] as num?)?.round() ?? 0;
    final status =
        lateMinutes > 0 &&
            const ['PRESENT', 'PRESENT_OPEN', 'ON_DUTY'].contains(rawStatus)
        ? 'LATE'
        : rawStatus;
    return AttendanceCalendarDay(
      date: date,
      status: status,
      isWorkingDay:
          json['isWorkingDay'] as bool? ??
          !const ['HOLIDAY', 'WEEKLY_OFF', 'NOT_APPLICABLE'].contains(status),
      isToday: json['isToday'] as bool? ?? false,
      isFuture: json['isFuture'] as bool? ?? false,
      isLocked: json['isLocked'] as bool? ?? json['lockedAt'] != null,
      canOpenDetails:
          json['canOpenDetails'] as bool? ??
          !const [
            'UPCOMING',
            'NOT_APPLICABLE',
            'HOLIDAY',
            'WEEKLY_OFF',
          ].contains(status),
      totalWorkMinutes: (json['totalWorkMinutes'] as num?)?.round() ?? 0,
      lateMinutes: lateMinutes,
      overtimeMinutes: (json['overtimeMinutes'] as num?)?.round() ?? 0,
      label: json['label'] as String?,
    );
  }
}

class AttendanceMonthSummary {
  const AttendanceMonthSummary({
    this.present = 0,
    this.lateDays = 0,
    this.absent = 0,
    this.leaveDays = 0,
    this.halfDays = 0,
    this.holidays = 0,
    this.weeklyOffs = 0,
    this.workMinutes = 0,
    this.overtimeMinutes = 0,
  });

  final int present;
  final int lateDays;
  final int absent;
  final int leaveDays;
  final int halfDays;
  final int holidays;
  final int weeklyOffs;
  final int workMinutes;
  final int overtimeMinutes;

  factory AttendanceMonthSummary.fromJson(
    Map<String, dynamic> json,
    List<AttendanceCalendarDay> days,
  ) {
    int value(String key, int fallback) =>
        (json[key] as num?)?.round() ?? fallback;
    int count(String status) =>
        days.where((day) => day.status == status).length;
    int minutes(int Function(AttendanceCalendarDay day) select) =>
        days.fold(0, (sum, day) => sum + select(day));
    return AttendanceMonthSummary(
      present: value('present', count('PRESENT') + count('PRESENT_OPEN')),
      lateDays: value('lateDays', count('LATE')),
      absent: value('absent', count('ABSENT')),
      leaveDays: value('leaveDays', count('ON_LEAVE')),
      halfDays: value('halfDays', count('HALF_DAY')),
      holidays: value('holidays', count('HOLIDAY')),
      weeklyOffs: value('weeklyOffs', count('WEEKLY_OFF')),
      workMinutes: value('workMinutes', minutes((day) => day.totalWorkMinutes)),
      overtimeMinutes: value(
        'overtimeMinutes',
        minutes((day) => day.overtimeMinutes),
      ),
    );
  }
}

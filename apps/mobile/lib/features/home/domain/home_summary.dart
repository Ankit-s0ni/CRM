class HomeSummary {
  const HomeSummary({
    required this.employeeName,
    required this.dateLabel,
    required this.shiftLabel,
    required this.locationLabel,
    required this.isInsideZone,
    required this.isCheckedIn,
    required this.employeeCode,
    required this.department,
    required this.managerName,
    required this.officeName,
    required this.workOverview,
    required this.policy,
    required this.timeline,
  });

  final String employeeName;
  final String dateLabel;
  final String shiftLabel;
  final String locationLabel;
  final bool? isInsideZone;
  final bool isCheckedIn;
  final String employeeCode;
  final String department;
  final String managerName;
  final String officeName;
  final HomeWorkOverview? workOverview;
  final HomePolicySnapshot? policy;
  final List<HomeTimelineEvent> timeline;
}

class HomeWorkOverview {
  const HomeWorkOverview({
    required this.workMinutes,
    required this.targetMinutes,
    required this.lateMinutes,
    required this.overtimeMinutes,
  });

  final int workMinutes;
  final int targetMinutes;
  final int lateMinutes;
  final int overtimeMinutes;
}

class HomePolicySnapshot {
  const HomePolicySnapshot({
    required this.name,
    required this.workMode,
    required this.shift,
    required this.locationRule,
    required this.selfieRule,
    required this.deviceRule,
    required this.nextHoliday,
  });

  final String name;
  final String workMode;
  final String shift;
  final String locationRule;
  final String selfieRule;
  final String deviceRule;
  final String? nextHoliday;
}

class HomeTimelineEvent {
  const HomeTimelineEvent({required this.type, required this.occurredAt});

  final String type;
  final DateTime occurredAt;
}

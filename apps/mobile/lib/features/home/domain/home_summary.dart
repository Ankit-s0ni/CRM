class HomeSummary {
  const HomeSummary({
    required this.employeeName,
    required this.dateLabel,
    required this.shiftLabel,
    required this.locationLabel,
    required this.isInsideZone,
    required this.isCheckedIn,
    this.employeeCode = 'EMP-1042',
    this.department = 'Operations',
    this.managerName = 'Mariam Al Balushi',
    this.officeName = 'Muscat Logistics Hub',
    this.weekHours = 31.5,
    this.weekTargetHours = 40,
    this.lateMinutes = 4,
    this.overtimeMinutes = 42,
    this.nextHolidayLabel = 'Renaissance Day · 23 July',
  });

  final String employeeName;
  final String dateLabel;
  final String shiftLabel;
  final String locationLabel;
  final bool isInsideZone;
  final bool isCheckedIn;
  final String employeeCode;
  final String department;
  final String managerName;
  final String officeName;
  final double weekHours;
  final double weekTargetHours;
  final int lateMinutes;
  final int overtimeMinutes;
  final String nextHolidayLabel;
}

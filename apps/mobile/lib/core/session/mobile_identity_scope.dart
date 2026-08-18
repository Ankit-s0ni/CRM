class MobileIdentityScope {
  const MobileIdentityScope({
    required this.tenantId,
    required this.userId,
    required this.membershipId,
    required this.employeeId,
    required this.deviceUuid,
    required this.contractVersion,
  });

  final String tenantId;
  final String userId;
  final String membershipId;
  final String employeeId;
  final String deviceUuid;
  final String contractVersion;

  bool get isComplete =>
      tenantId.isNotEmpty &&
      userId.isNotEmpty &&
      membershipId.isNotEmpty &&
      employeeId.isNotEmpty &&
      deviceUuid.isNotEmpty &&
      contractVersion.isNotEmpty;

  String get ownerKey =>
      '$tenantId|$userId|$membershipId|$employeeId|$deviceUuid|$contractVersion';

  Map<String, dynamic> toJson() => {
    'tenantId': tenantId,
    'userId': userId,
    'membershipId': membershipId,
    'employeeId': employeeId,
    'deviceUuid': deviceUuid,
    'contractVersion': contractVersion,
  };

  factory MobileIdentityScope.fromJson(Map<String, dynamic> json) =>
      MobileIdentityScope(
        tenantId: json['tenantId'] as String? ?? '',
        userId: json['userId'] as String? ?? '',
        membershipId: json['membershipId'] as String? ?? '',
        employeeId: json['employeeId'] as String? ?? '',
        deviceUuid: json['deviceUuid'] as String? ?? '',
        contractVersion: json['contractVersion'] as String? ?? '',
      );
}

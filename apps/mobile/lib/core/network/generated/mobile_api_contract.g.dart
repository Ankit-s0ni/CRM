// GENERATED FILE. Run `pnpm mobile:contracts:generate`; do not edit manually.
const platformMobileContractSha256 = '7874784163530d16c6c7e7468e4b20b981394cfbf28bc68111515abdefe38c79';
const hrmsMobileContractSha256 = 'e25231db22bf2114e6527b5a0506f36ad41f7910350e2a868b0db424c42b86f1';
const hrmsProductContractVersion = '1.1.0';

enum AttendanceEventType { checkin, checkout, breakStart, breakEnd }
enum SyncOutcomeStatus { accepted, duplicate, rejected, retryable }

class ProductTokenRequest {
  const ProductTokenRequest({this.audience = 'hrms-api'});
  final String audience;
  Map<String, dynamic> toJson() => {'audience': audience};
}

class ProductTokenResponse {
  const ProductTokenResponse({required this.accessToken, required this.expiresIn});
  final String accessToken;
  final int expiresIn;
  factory ProductTokenResponse.fromJson(Map<String, dynamic> json) => ProductTokenResponse(
    accessToken: json['accessToken'] as String,
    expiresIn: (json['expiresIn'] as num).toInt(),
  );
}

class MobileApiError {
  const MobileApiError({required this.code, required this.message, this.requestId});
  final String code;
  final String message;
  final String? requestId;
  factory MobileApiError.fromJson(Map<String, dynamic> json) => MobileApiError(
    code: json['code'] as String,
    message: json['message'] as String,
    requestId: json['requestId'] as String?,
  );
}

class HrmsPunchRequest {
  const HrmsPunchRequest({
    required this.clientEventUuid,
    required this.eventType,
    required this.eventTime,
    this.deviceUuid,
    this.integrityToken,
    this.evidenceKey,
  });
  final String clientEventUuid;
  final AttendanceEventType eventType;
  final DateTime eventTime;
  final String? deviceUuid;
  final String? integrityToken;
  final String? evidenceKey;
  Map<String, dynamic> toJson() => {
    'clientEventUuid': clientEventUuid,
    'eventType': switch (eventType) {
      AttendanceEventType.checkin => 'CHECKIN',
      AttendanceEventType.checkout => 'CHECKOUT',
      AttendanceEventType.breakStart => 'BREAK_START',
      AttendanceEventType.breakEnd => 'BREAK_END',
    },
    'eventTime': eventTime.toUtc().toIso8601String(),
    'source': 'MOBILE',
    if (deviceUuid != null) 'deviceUuid': deviceUuid,
    if (integrityToken != null) 'integrityToken': integrityToken,
    if (evidenceKey != null) 'evidenceKey': evidenceKey,
  };
}

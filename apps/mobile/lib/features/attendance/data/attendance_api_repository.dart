import 'package:dio/dio.dart';

import '../../../core/media/evidence_image_processor.dart';
import '../../../core/network/api_routes.dart';
import '../../../core/network/authority_clients.dart';
import '../../../core/utils/uuid.dart';
import '../domain/attendance_repository.dart';
import '../domain/monthly_attendance_history.dart';

class AttendanceApiRepository implements AttendanceRepository {
  AttendanceApiRepository(this._api, {EvidenceImageProcessor? imageProcessor})
    : _imageProcessor = imageProcessor ?? EvidenceImageProcessor();
  final HrmsApiClient _api;
  final EvidenceImageProcessor _imageProcessor;
  @override
  Future<PunchResult> punch({
    required String type,
    String? filePath,
    required Map<String, String> device,
    double? latitude,
    double? longitude,
    int? accuracyMeters,
    bool? mockLocation,
    required String attestationToken,
  }) async {
    try {
      String? objectKey;
      if (filePath != null) {
        late final List<int> bytes;
        try {
          bytes = await _imageProcessor.process(filePath);
        } on EvidenceImageException {
          throw const PunchFailure(
            code: 'PUNCH_EVIDENCE_INVALID',
            message: 'Capture a clear JPEG photo under 5 MB and try again.',
          );
        }
        final presign = await _api.post<Map<String, dynamic>>(
          ApiRoutes.punchEvidencePresign,
          data: {
            'filename': 'attendance.jpg',
            'contentType': 'image/jpeg',
            'fileSize': bytes.length,
          },
        );
        final upload = presign.data?['data'] as Map<String, dynamic>?;
        objectKey = upload?['objectKey'] as String?;
        final uploadUrl = upload?['uploadUrl'] as String?;
        if (objectKey == null || uploadUrl == null) {
          throw const FormatException('Invalid evidence upload contract');
        }
        await _api.putBytes(uploadUrl, bytes, 'image/jpeg');
      }
      final response = await _api.post<Map<String, dynamic>>(
        ApiRoutes.punches,
        data: {
          'eventType': type,
          'clientEventUuid': newUuid(),
          'source': 'MOBILE',
          'eventTime': DateTime.now().toUtc().toIso8601String(),
          'deviceUuid': device['deviceUuid'],
          'integrityToken': attestationToken,
          'latitude': ?latitude,
          'longitude': ?longitude,
          'accuracyM': ?accuracyMeters,
          'mockLocation': ?mockLocation,
          'evidenceKey': ?objectKey,
          'appVersion': device['appVersion'],
          'osVersion': device['osVersion'],
        },
      );
      final body = response.data ?? const <String, dynamic>{};
      final verification = body['verification'] as Map<String, dynamic>?;
      final checks = (verification?['checks'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .where((check) => check['passed'] == true)
          .map((check) => check['check'] as String)
          .toList(growable: false);
      return PunchResult(
        verificationId: verification?['id'] as String? ?? '',
        checks: checks,
        attendance:
            body['log'] as Map<String, dynamic>? ??
            body['data'] as Map<String, dynamic>? ??
            body,
      );
    } on DioException catch (error) {
      final body = error.response?.data;
      if (body is Map<String, dynamic>) {
        throw PunchFailure(
          code: body['code'] as String? ?? 'VERIFICATION_FAILED',
          message:
              body['message'] as String? ?? 'Attendance verification failed.',
          details:
              body['details'] as Map<String, dynamic>? ??
              const <String, dynamic>{},
        );
      }
      throw const PunchFailure(
        code: 'NETWORK_UNAVAILABLE',
        message:
            'Attendance verification is unavailable. Check your connection.',
      );
    }
  }

  @override
  Future<Map<String, dynamic>> today() async =>
      (await _api.get<Map<String, dynamic>>(ApiRoutes.attendanceToday)).data ??
      const <String, dynamic>{};

  @override
  Future<void> toggleBreak(String action) async => _api.post(
    ApiRoutes.punches,
    data: {
      'eventType': action == 'START' ? 'BREAK_START' : 'BREAK_END',
      'clientEventUuid': newUuid(),
      'source': 'MOBILE',
      'eventTime': DateTime.now().toUtc().toIso8601String(),
    },
  );
  @override
  Future<MonthlyAttendanceHistory> history({required String month}) async {
    final parts = month.split('-');
    if (parts.length != 2) {
      throw const FormatException('Attendance month must use YYYY-MM');
    }
    final year = int.parse(parts[0]);
    final monthNumber = int.parse(parts[1]);
    final from = DateTime.utc(year, monthNumber, 1);
    final to = DateTime.utc(year, monthNumber + 1, 0);
    String date(DateTime value) => value.toIso8601String().substring(0, 10);
    final response = await _api.get<Map<String, dynamic>>(
      ApiRoutes.attendanceHistory,
      query: {'from': date(from), 'to': date(to), 'limit': 31},
    );
    return MonthlyAttendanceHistory.fromJson(
      response.data ?? const {},
      requestedMonth: month,
    );
  }

  @override
  Future<Map<String, dynamic>> day(String date) async =>
      (await _api.get<Map<String, dynamic>>(
            ApiRoutes.attendanceDay(date),
          )).data?['data']
          as Map<String, dynamic>? ??
      {};
}

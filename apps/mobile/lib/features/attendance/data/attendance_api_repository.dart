import 'package:dio/dio.dart';

import '../../../core/media/evidence_image_processor.dart';
import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/attendance_repository.dart';

class AttendanceApiRepository implements AttendanceRepository {
  AttendanceApiRepository(this._api, {EvidenceImageProcessor? imageProcessor})
    : _imageProcessor = imageProcessor ?? EvidenceImageProcessor();
  final ApiService _api;
  final EvidenceImageProcessor _imageProcessor;
  @override
  Future<PunchResult> punch({
    required String type,
    required String filePath,
    required Map<String, String> device,
    required double latitude,
    required double longitude,
    required int accuracyMeters,
    required bool mockLocation,
    required String attestationToken,
  }) async {
    late final List<int> bytes;
    try {
      bytes = await _imageProcessor.process(filePath);
    } on EvidenceImageException {
      throw const PunchFailure(
        code: 'PUNCH_EVIDENCE_INVALID',
        message: 'Capture a clear JPEG photo under 5 MB and try again.',
      );
    }
    try {
      final presign = await _api.post<Map<String, dynamic>>(
        ApiRoutes.punchEvidencePresign,
        data: {
          'filename': 'attendance.jpg',
          'contentType': 'image/jpeg',
          'fileSize': bytes.length,
        },
      );
      final upload = presign.data?['data'] as Map<String, dynamic>?;
      final objectKey = upload?['objectKey'] as String?;
      final uploadUrl = upload?['uploadUrl'] as String?;
      if (objectKey == null || uploadUrl == null) {
        throw const FormatException('Invalid evidence upload contract');
      }
      await _api.putBytes(uploadUrl, bytes, 'image/jpeg');
      final response = await _api.post<Map<String, dynamic>>(
        ApiRoutes.punches,
        data: {
          'type': type,
          'deviceUuid': device['deviceUuid'],
          'attestationToken': attestationToken,
          'clientTime': DateTime.now().toUtc().toIso8601String(),
          'requestId': _requestId(),
          'latitude': latitude,
          'longitude': longitude,
          'accuracyMeters': accuracyMeters,
          'mockLocation': mockLocation,
          'selfieKey': objectKey,
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
        attendance: body['data'] as Map<String, dynamic>? ?? body,
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
  Future<void> toggleBreak(String action) async => _api.post(
    action == 'START' ? ApiRoutes.breakStart : ApiRoutes.breakEnd,
    data: {'requestId': _requestId()},
  );
  @override
  Future<List<Map<String, dynamic>>> history({String? month}) async =>
      ((await _api.get<Map<String, dynamic>>(
                    ApiRoutes.attendanceHistory,
                    query: {'month': month},
                  )).data?['data']
                  as List<dynamic>? ??
              const [])
          .whereType<Map<String, dynamic>>()
          .toList(growable: false);
  @override
  Future<Map<String, dynamic>> day(String date) async =>
      (await _api.get<Map<String, dynamic>>(
            ApiRoutes.attendanceDay(date),
          )).data?['data']
          as Map<String, dynamic>? ??
      {};
}

String _requestId() {
  final value = DateTime.now().microsecondsSinceEpoch
      .toRadixString(16)
      .padLeft(12, '0');
  return '00000000-0000-4000-8000-${value.substring(value.length - 12)}';
}

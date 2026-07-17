import '../../../core/media/evidence_image_processor.dart';
import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/enrollment_repository.dart';

class EnrollmentApiRepository implements EnrollmentRepository {
  EnrollmentApiRepository(this._api, {EvidenceImageProcessor? imageProcessor})
    : _imageProcessor = imageProcessor ?? EvidenceImageProcessor();
  final ApiService _api;
  final EvidenceImageProcessor _imageProcessor;

  @override
  Future<Map<String, dynamic>> status() async {
    final response = await _api.get<Map<String, dynamic>>(
      ApiRoutes.enrollmentStatus,
    );
    final data = response.data?['data'];
    return data is Map<String, dynamic> ? data : const {};
  }

  @override
  Future<void> enroll(String filePath) async {
    final bytes = await _imageProcessor.process(filePath);
    final presign = await _api.post<Map<String, dynamic>>(
      ApiRoutes.enrollmentPresign,
      data: {
        'filename': 'face-enrollment.jpg',
        'contentType': 'image/jpeg',
        'fileSize': bytes.length,
      },
    );
    final data = presign.data?['data'];
    if (data is! Map<String, dynamic>) {
      throw const FormatException('The enrollment upload response is invalid.');
    }
    final objectKey = data['objectKey'];
    final uploadUrl = data['uploadUrl'];
    if (objectKey is! String || uploadUrl is! String) {
      throw const FormatException('The enrollment upload response is invalid.');
    }
    await _api.putBytes(uploadUrl, bytes, 'image/jpeg');
    await _api.post(
      ApiRoutes.faceEnrollments,
      data: {
        'privateObjectKey': objectKey,
        'livenessProofToken': 'dev-live:$objectKey',
      },
    );
  }
}

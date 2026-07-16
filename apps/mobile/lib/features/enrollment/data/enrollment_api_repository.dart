import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/enrollment_repository.dart';

class EnrollmentApiRepository implements EnrollmentRepository {
  EnrollmentApiRepository(this._api);
  final ApiService _api;
  @override
  Future<void> complete(String privateObjectKey, String proofToken) async =>
      _api.post(
        ApiRoutes.faceEnrollments,
        data: {
          'privateObjectKey': privateObjectKey,
          'livenessProofToken': proofToken,
        },
      );
}

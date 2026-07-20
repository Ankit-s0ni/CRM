import '../../../core/device/device_identity.dart';
import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/device_repository.dart';

class DeviceApiRepository implements DeviceRepository {
  DeviceApiRepository(this._api, this._identity);
  final ApiService _api;
  final DeviceIdentity _identity;
  @override
  Future<void> register(Map<String, dynamic> device) async =>
      _api.post(ApiRoutes.registerDevice, data: device);
  @override
  Future<Map<String, dynamic>> current() async {
    final identity = await _identity.payload();
    final response =
        (await _api.get<Map<String, dynamic>>(
          ApiRoutes.myDevice,
          headers: {'x-device-uuid': identity['deviceUuid']},
        )).data ??
        const <String, dynamic>{};
    final devices = response['data'];
    if (devices is List && devices.whereType<Map<String, dynamic>>().isEmpty) {
      return {'data': identity};
    }
    return response;
  }

  @override
  Future<void> unregister() async => _api.delete(ApiRoutes.myDevice);
}

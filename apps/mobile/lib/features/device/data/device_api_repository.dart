import '../../../core/network/api_routes.dart';
import '../../../core/network/api_service.dart';
import '../domain/device_repository.dart';

class DeviceApiRepository implements DeviceRepository {
  DeviceApiRepository(this._api);
  final ApiService _api;
  @override
  Future<void> register(Map<String, dynamic> device) async =>
      _api.post(ApiRoutes.registerDevice, data: device);
  @override
  Future<Map<String, dynamic>> current() async =>
      (await _api.get<Map<String, dynamic>>(ApiRoutes.myDevice)).data ?? {};
}

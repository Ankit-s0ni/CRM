import 'app_capability.dart';

abstract interface class CapabilityRepository {
  Future<CapabilitySnapshot> inspect();
  Future<CapabilitySnapshot> request(AppCapability capability);
  Future<bool> openSettings();
}

enum AppCapability {
  camera,
  locationWhileUsing,
  backgroundLocation,
  notifications,
  batteryOptimization,
}

enum CapabilityStatus {
  granted,
  denied,
  permanentlyDenied,
  restricted,
  limited,
  unavailable,
}

class CapabilityPermission {
  const CapabilityPermission({required this.capability, required this.status});
  final AppCapability capability;
  final CapabilityStatus status;
  bool get isGranted =>
      status == CapabilityStatus.granted || status == CapabilityStatus.limited;
}

class CapabilitySnapshot {
  const CapabilitySnapshot({
    required this.permissions,
    required this.isOnline,
    required this.batteryLevel,
    required this.isWeb,
  });
  final Map<AppCapability, CapabilityPermission> permissions;
  final bool isOnline;
  final int? batteryLevel;
  final bool isWeb;

  CapabilityPermission permission(AppCapability capability) =>
      permissions[capability] ??
      CapabilityPermission(
        capability: capability,
        status: CapabilityStatus.unavailable,
      );
}

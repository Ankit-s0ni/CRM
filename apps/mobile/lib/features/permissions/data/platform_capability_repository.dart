import 'package:battery_plus/battery_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import '../domain/app_capability.dart';
import '../domain/capability_repository.dart';

class PlatformCapabilityRepository implements CapabilityRepository {
  PlatformCapabilityRepository({Connectivity? connectivity, Battery? battery})
    : _connectivity = connectivity ?? Connectivity(),
      _battery = battery ?? Battery();

  final Connectivity _connectivity;
  final Battery _battery;

  bool get _isAndroid =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  @override
  Future<CapabilitySnapshot> inspect() async {
    final connectivity = await _connectivity.checkConnectivity();
    final permissions = <AppCapability, CapabilityPermission>{};
    for (final capability in AppCapability.values) {
      permissions[capability] = CapabilityPermission(
        capability: capability,
        status: await _status(capability),
      );
    }
    int? batteryLevel;
    try {
      batteryLevel = await _battery.batteryLevel;
    } catch (_) {
      batteryLevel = null;
    }
    return CapabilitySnapshot(
      permissions: permissions,
      isOnline: !connectivity.contains(ConnectivityResult.none),
      batteryLevel: batteryLevel,
      isWeb: kIsWeb,
    );
  }

  @override
  Future<CapabilitySnapshot> request(AppCapability capability) async {
    if (capability == AppCapability.backgroundLocation && kIsWeb) {
      return inspect();
    }
    if (capability == AppCapability.batteryOptimization && !_isAndroid) {
      return inspect();
    }
    final permission = _permission(capability);
    final currentStatus = await permission.status;
    if (currentStatus.isPermanentlyDenied) {
      await openAppSettings();
      return inspect();
    }

    if (capability == AppCapability.locationWhileUsing) {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        await Geolocator.openLocationSettings();
        return inspect();
      }
    }

    if (capability == AppCapability.backgroundLocation) {
      final foregroundStatus = await Permission.locationWhenInUse.status;
      if (!foregroundStatus.isGranted && !foregroundStatus.isLimited) {
        await Permission.locationWhenInUse.request();
        return inspect();
      }
    }

    await permission.request();

    if (capability == AppCapability.locationWhileUsing &&
        await permission.isGranted) {
      final accuracy = await Geolocator.getLocationAccuracy();
      if (accuracy == LocationAccuracyStatus.reduced) {
        if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
          await Geolocator.requestTemporaryFullAccuracy(
            purposeKey: 'AttendanceVerification',
          );
        } else {
          await openAppSettings();
        }
      }
    }
    return inspect();
  }

  @override
  Future<bool> openSettings() => openAppSettings();

  Future<CapabilityStatus> _status(AppCapability capability) async {
    if (capability == AppCapability.backgroundLocation && kIsWeb) {
      return CapabilityStatus.unavailable;
    }
    if (capability == AppCapability.batteryOptimization && !_isAndroid) {
      return CapabilityStatus.unavailable;
    }
    if (capability == AppCapability.locationWhileUsing) {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) return CapabilityStatus.restricted;
    }
    final status = await _permission(capability).status;
    if (status.isGranted) {
      if (capability == AppCapability.locationWhileUsing) {
        final accuracy = await Geolocator.getLocationAccuracy();
        if (accuracy == LocationAccuracyStatus.reduced) {
          return CapabilityStatus.limited;
        }
      }
      return CapabilityStatus.granted;
    }
    if (status.isLimited) return CapabilityStatus.limited;
    if (status.isPermanentlyDenied) return CapabilityStatus.permanentlyDenied;
    if (status.isRestricted) return CapabilityStatus.restricted;
    return CapabilityStatus.denied;
  }

  Permission _permission(AppCapability capability) => switch (capability) {
    AppCapability.camera => Permission.camera,
    AppCapability.locationWhileUsing => Permission.locationWhenInUse,
    AppCapability.backgroundLocation => Permission.locationAlways,
    AppCapability.notifications => Permission.notification,
    AppCapability.batteryOptimization => Permission.ignoreBatteryOptimizations,
  };
}

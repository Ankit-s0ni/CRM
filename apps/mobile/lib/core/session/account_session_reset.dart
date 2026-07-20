import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/attendance/presentation/attendance_controller.dart';
import '../../features/consent/presentation/consent_controller.dart';
import '../../features/device/presentation/device_controller.dart';
import '../../features/enrollment/presentation/enrollment_controller.dart';
import '../../features/home/presentation/home_controller.dart';
import '../../features/profile/presentation/profile_controller.dart';
import '../../features/sync/presentation/sync_controller.dart';
import '../../features/tracking/presentation/tracking_controller.dart';

/// Discards every in-memory projection that belongs to the signed-in employee.
///
/// These providers intentionally live across navigation, so changing accounts
/// must invalidate them explicitly to prevent one employee's state appearing in
/// another employee's session.
void resetAccountSession(Ref ref) {
  ref.invalidate(attendanceControllerProvider);
  ref.invalidate(attendanceHistoryProvider);
  ref.invalidate(attendanceDayProvider);
  ref.invalidate(homeControllerProvider);
  ref.invalidate(profileControllerProvider);
  ref.invalidate(deviceControllerProvider);
  ref.invalidate(consentControllerProvider);
  ref.invalidate(enrollmentControllerProvider);
  ref.invalidate(syncControllerProvider);
  ref.invalidate(syncRepositoryProvider);
  ref.invalidate(attendanceOfflineQueueProvider);
  ref.invalidate(trackingControllerProvider);
  ref.invalidate(trackingRepositoryProvider);
}

// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'People Operations';

  @override
  String get signInTitle => 'Your workday, beautifully organised.';

  @override
  String get signInSubtitle =>
      'Attendance, shifts and requests in one secure workspace.';

  @override
  String get workEmail => 'Work email';

  @override
  String get emailHint => 'name@company.com';

  @override
  String get password => 'Password';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get signInSecurely => 'Sign in securely';

  @override
  String get signingIn => 'Signing in…';

  @override
  String get emailRequired => 'Enter your work email';

  @override
  String get passwordRequired => 'Enter your password';

  @override
  String get resetPassword => 'Reset your password';

  @override
  String get resetPasswordHelp =>
      'Contact your HR administrator to reset your employee account password.';

  @override
  String get gotIt => 'Got it';

  @override
  String get protectedWorkspace => 'Protected employee workspace';

  @override
  String get checkingSession => 'Checking session…';

  @override
  String get goodMorning => 'GOOD MORNING';

  @override
  String get today => 'Today';

  @override
  String get todaysShift => 'TODAY’S SHIFT';

  @override
  String get onSchedule => 'ON SCHEDULE';

  @override
  String get checkInToday => 'Check in for today';

  @override
  String get checkOutToday => 'Check out for today';

  @override
  String get history => 'History';

  @override
  String get attendance => 'Attendance';

  @override
  String get requests => 'Requests';

  @override
  String get profile => 'Profile';

  @override
  String get notifications => 'Notifications';

  @override
  String get more => 'More';

  @override
  String get takeBreak => 'Take a break';

  @override
  String get endBreak => 'End break';

  @override
  String get fieldTracking => 'Field tracking';

  @override
  String get offlineSync => 'Offline sync';

  @override
  String get settings => 'Settings';

  @override
  String get workTools => 'Work tools';

  @override
  String get todaysActivity => 'Today’s activity';

  @override
  String get viewDetails => 'View details';

  @override
  String get readyWhenYouAre => 'Ready when you are';

  @override
  String get firstActivityHere => 'Your first activity will appear here';

  @override
  String checkedInAt(String time) {
    return 'Checked in at $time';
  }

  @override
  String checkedOutAt(String time) {
    return 'Checked out at $time';
  }

  @override
  String get workingTimeTracked => 'Working time is being tracked';

  @override
  String get leaveApp => 'Leave the app?';

  @override
  String get remainSignedIn => 'You will remain signed in on this device.';

  @override
  String get exit => 'Exit';

  @override
  String get stay => 'Stay';

  @override
  String get safeToClose => 'You can safely close this window.';

  @override
  String get cameraCheckIn => 'Check in';

  @override
  String get cameraCheckOut => 'Check out';

  @override
  String get preparingCamera => 'Preparing secure camera…';

  @override
  String get cameraRequired =>
      'Camera access is required to verify your identity.';

  @override
  String get cameraUnavailable =>
      'Camera is unavailable. Check access and try again.';

  @override
  String get centreFace => 'Centre your face and look directly at the camera';

  @override
  String get verifyingFaceLocation => 'Verifying face and location…';

  @override
  String get captureFailed => 'Capture failed. Hold steady and try again.';

  @override
  String get secureCapture => 'SECURE CAPTURE';

  @override
  String get initialising => 'INITIALISING';

  @override
  String get verificationEvidence =>
      'Face match  •  Live location  •  Registered device';

  @override
  String get verifyCheckIn => 'Verify and check in';

  @override
  String get verifyCheckOut => 'Verify and check out';

  @override
  String get tryCameraAgain => 'Try camera again';

  @override
  String get verifyingAttendance => 'Verifying your attendance';

  @override
  String get keepScreenOpen =>
      'Keep this screen open. This usually takes only a moment.';

  @override
  String get secureVerification => 'Secure verification in progress';

  @override
  String get verificationInProgress => 'Verification in progress';

  @override
  String get verificationWait =>
      'Please wait a moment while we securely verify this attendance punch.';

  @override
  String get punchSuccessful => 'Punch successful';

  @override
  String get done => 'Done';

  @override
  String get viewTimeline => 'View today’s timeline';

  @override
  String get attendanceHistory => 'Attendance history';

  @override
  String get monthlySummary => 'Monthly summary';

  @override
  String get dayDetail => 'Day detail';

  @override
  String get requestCorrection => 'Request correction';

  @override
  String get regularizationRequest => 'Regularization request';

  @override
  String get correctionDetails => 'Correction details';

  @override
  String get requestedCheckout => 'Requested check-out';

  @override
  String get selectTime => 'Select time';

  @override
  String get reason => 'Reason';

  @override
  String get reasonHint => 'Briefly explain what happened';

  @override
  String get sendManager => 'Send to manager';

  @override
  String get submitting => 'Submitting…';

  @override
  String get selectCheckoutTime => 'Select the requested check-out time.';

  @override
  String get reasonRequired => 'Explain why the punch is missing';

  @override
  String get reasonMoreDetail => 'Add a little more detail for your manager';

  @override
  String get submitRequest => 'Submit this request?';

  @override
  String get submitRequestWarning =>
      'Your manager will review the corrected time and reason. Submitted requests cannot be edited.';

  @override
  String get requestSent => 'Regularization request sent to your manager.';

  @override
  String get myRequests => 'My requests';

  @override
  String get pending => 'Pending';

  @override
  String get approved => 'Approved';

  @override
  String get rejected => 'Rejected';

  @override
  String get registerDevice => 'Register this device';

  @override
  String get registerDeviceAction => 'Register device';

  @override
  String get devicePolicy =>
      'Attendance punches are only allowed from your registered device.';

  @override
  String get attendancePermissions => 'Attendance permissions';

  @override
  String get permissionsIntro =>
      'Enable the capabilities used by your attendance policy. You stay in control and can change them later.';

  @override
  String get continueAction => 'Continue';

  @override
  String get faceConsent => 'Face verification consent';

  @override
  String get consentAgreement => 'I agree to biometric verification';

  @override
  String get giveConsent => 'Give consent';

  @override
  String get declineGps => 'Decline — use GPS only';

  @override
  String get faceEnrollment => 'Face enrollment';

  @override
  String get captureEnrollment => 'Capture enrollment';

  @override
  String notificationsUnread(int count) {
    return '$count unread';
  }

  @override
  String get markAllRead => 'Mark all read';

  @override
  String get allCaughtUp => 'You’re all caught up.';

  @override
  String get allRead => 'All notifications marked as read.';

  @override
  String get settingsPermissions => 'Settings & permissions';

  @override
  String get permissions => 'Permissions';

  @override
  String get preferences => 'Preferences';

  @override
  String get checkInReminder => 'Check-in reminder';

  @override
  String get checkOutReminder => 'Check-out reminder';

  @override
  String get language => 'Language';

  @override
  String get english => 'English';

  @override
  String get arabic => 'العربية';

  @override
  String get unregisterDevice => 'Unregister this device';

  @override
  String get startTracking => 'Start field tracking';

  @override
  String get stopTracking => 'Stop field tracking';

  @override
  String get trackingActive => 'Field tracking is active';

  @override
  String get trackingOff => 'Field tracking is off';

  @override
  String get syncNow => 'Sync now';

  @override
  String get everythingSynced => 'Everything is synced';

  @override
  String get startBreak => 'Start break';

  @override
  String get breakInProgress => 'Break in progress';

  @override
  String get companyCode => 'Employee ID';

  @override
  String get department => 'Department';

  @override
  String get manager => 'Manager';

  @override
  String get office => 'Office';

  @override
  String get workPolicy => 'Work policy';

  @override
  String get timezone => 'Timezone';

  @override
  String get employeeStatus => 'Employee status';

  @override
  String get active => 'Active';

  @override
  String get weekOverview => 'Week overview';

  @override
  String get hoursWorked => 'Hours worked';

  @override
  String get lateMinutes => 'Late minutes';

  @override
  String get overtime => 'Overtime';

  @override
  String get locationStatus => 'Location status';

  @override
  String get insideOfficeZone => 'Inside office zone';

  @override
  String get shiftProgress => 'Shift progress';

  @override
  String get nextHoliday => 'Next holiday';

  @override
  String get policySnapshot => 'Policy snapshot';

  @override
  String get browserPermissionMode => 'Browser permission mode';

  @override
  String get camera => 'Camera';

  @override
  String get preciseLocation => 'Precise location';

  @override
  String get backgroundLocation => 'Background location';

  @override
  String get batteryOptimization => 'Battery optimization';

  @override
  String get enable => 'Enable';

  @override
  String get retry => 'Retry';

  @override
  String get continueWithoutFace => 'Continue without face verification?';

  @override
  String get continueWithoutFaceWarning =>
      'Your attendance policy may require additional manager review when biometric verification is unavailable.';

  @override
  String get continueWithGps => 'Continue with GPS';

  @override
  String get consentDataTitle => 'What we store';

  @override
  String get consentDataBody =>
      'A face template generated from your enrollment photo.';

  @override
  String get consentUseTitle => 'How it is used';

  @override
  String get consentUseBody =>
      'Attendance verification only. Deleted when your employment ends.';

  @override
  String get punchFailed => 'Punch could not be completed';

  @override
  String get failureStates => 'Verification help';

  @override
  String get notifyBeforeShift => 'Notify me shortly before my shift';

  @override
  String get notifyShiftEnd => 'Notify me near the end of my shift';

  @override
  String get unregisterConfirm => 'Unregister this device?';

  @override
  String get unregisterWarning =>
      'Attendance punches will be blocked until HR approves a replacement device.';

  @override
  String get unregisterAction => 'Unregister device';

  @override
  String get deviceUnregistered => 'Device unregistered';

  @override
  String get notificationApproved => 'Your regularization was approved';

  @override
  String get notificationShiftEnd => 'Your shift ends in 15 minutes';

  @override
  String get notificationOfficeZone => 'You entered the office zone';

  @override
  String get notificationSynced => 'Offline punch synced successfully';

  @override
  String get recentDays => 'Recent days';

  @override
  String get present => 'Present';

  @override
  String get late => 'Late';

  @override
  String get absent => 'Absent';

  @override
  String get leave => 'Leave';

  @override
  String get worked => 'Worked';

  @override
  String get distance => 'Distance';

  @override
  String get pings => 'Pings';

  @override
  String get stops => 'Stops';

  @override
  String get captureGuidance => 'Centre your face → Blink slowly → Hold still';

  @override
  String get faceDeviceVerified => 'Face, device and location verified';

  @override
  String get breakLabel => 'Break';

  @override
  String get checkoutLabel => 'Check-out';

  @override
  String get checkinLabel => 'Check-in';

  @override
  String get cameraRationale =>
      'Required for liveness and face verification during a punch.';

  @override
  String get locationRationale =>
      'Confirms you are inside an assigned office or field location.';

  @override
  String get backgroundLocationRationale =>
      'Used only during an active field shift to record scheduled route pings.';

  @override
  String get notificationRationale =>
      'Delivers shift reminders, approvals, sync results, and security notices.';

  @override
  String get batteryRationale =>
      'Allows reliable scheduled tracking while a field shift is active.';

  @override
  String get allowed => 'Allowed';

  @override
  String get limited => 'Limited';

  @override
  String get notAllowed => 'Not allowed';

  @override
  String get openSettings => 'Open settings';

  @override
  String get restricted => 'Restricted';

  @override
  String get notAvailable => 'Not available on this platform';

  @override
  String get missingCheckout => 'Missing check-out';

  @override
  String get requestsSevenDays => 'Requests are allowed within 7 days';

  @override
  String get deviceIssue => 'Device issue';

  @override
  String get privacyPolicy => 'Privacy policy';

  @override
  String get licenses => 'Licenses';

  @override
  String get yesterday => 'Yesterday';

  @override
  String get monday => 'Monday';

  @override
  String get verificationEvidenceTitle => 'Verification evidence';

  @override
  String get faceLiveness => 'Face & liveness';

  @override
  String get registeredDevice => 'Registered device';

  @override
  String get integrity => 'Integrity';

  @override
  String get verified => 'Verified';

  @override
  String get passed => 'Passed';

  @override
  String get payrollStatus => 'Payroll status';

  @override
  String get open => 'Open';

  @override
  String get correctionsAllowed => 'Corrections allowed until 23 July';

  @override
  String get all => 'All';

  @override
  String requestsCount(int count) {
    return '$count requests';
  }

  @override
  String get shiftCorrection => 'Shift correction';

  @override
  String minutesValue(int count) {
    return '$count minutes';
  }

  @override
  String get savedOfflineSynced => 'Saved offline · synced successfully';

  @override
  String get logout => 'Log out';

  @override
  String get logoutConfirmTitle => 'Log out of DeltCRM?';

  @override
  String get logoutConfirmMessage =>
      'You will need to enter your email and password to sign in again.';
}

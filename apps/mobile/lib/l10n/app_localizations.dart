import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'People Operations'**
  String get appName;

  /// No description provided for @signInTitle.
  ///
  /// In en, this message translates to:
  /// **'Your workday, beautifully organised.'**
  String get signInTitle;

  /// No description provided for @signInSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Attendance, shifts and requests in one secure workspace.'**
  String get signInSubtitle;

  /// No description provided for @workEmail.
  ///
  /// In en, this message translates to:
  /// **'Work email'**
  String get workEmail;

  /// No description provided for @emailHint.
  ///
  /// In en, this message translates to:
  /// **'name@company.com'**
  String get emailHint;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get forgotPassword;

  /// No description provided for @signInSecurely.
  ///
  /// In en, this message translates to:
  /// **'Sign in securely'**
  String get signInSecurely;

  /// No description provided for @signingIn.
  ///
  /// In en, this message translates to:
  /// **'Signing in…'**
  String get signingIn;

  /// No description provided for @emailRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your work email'**
  String get emailRequired;

  /// No description provided for @passwordRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your password'**
  String get passwordRequired;

  /// No description provided for @resetPassword.
  ///
  /// In en, this message translates to:
  /// **'Reset your password'**
  String get resetPassword;

  /// No description provided for @resetPasswordHelp.
  ///
  /// In en, this message translates to:
  /// **'Contact your HR administrator to reset your employee account password.'**
  String get resetPasswordHelp;

  /// No description provided for @gotIt.
  ///
  /// In en, this message translates to:
  /// **'Got it'**
  String get gotIt;

  /// No description provided for @protectedWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Protected employee workspace'**
  String get protectedWorkspace;

  /// No description provided for @checkingSession.
  ///
  /// In en, this message translates to:
  /// **'Checking session…'**
  String get checkingSession;

  /// No description provided for @goodMorning.
  ///
  /// In en, this message translates to:
  /// **'GOOD MORNING'**
  String get goodMorning;

  /// No description provided for @today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get today;

  /// No description provided for @todaysShift.
  ///
  /// In en, this message translates to:
  /// **'TODAY’S SHIFT'**
  String get todaysShift;

  /// No description provided for @onSchedule.
  ///
  /// In en, this message translates to:
  /// **'ON SCHEDULE'**
  String get onSchedule;

  /// No description provided for @checkInToday.
  ///
  /// In en, this message translates to:
  /// **'Check in for today'**
  String get checkInToday;

  /// No description provided for @checkOutToday.
  ///
  /// In en, this message translates to:
  /// **'Check out for today'**
  String get checkOutToday;

  /// No description provided for @history.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get history;

  /// No description provided for @attendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get attendance;

  /// No description provided for @requests.
  ///
  /// In en, this message translates to:
  /// **'Requests'**
  String get requests;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @more.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get more;

  /// No description provided for @takeBreak.
  ///
  /// In en, this message translates to:
  /// **'Take a break'**
  String get takeBreak;

  /// No description provided for @endBreak.
  ///
  /// In en, this message translates to:
  /// **'End break'**
  String get endBreak;

  /// No description provided for @fieldTracking.
  ///
  /// In en, this message translates to:
  /// **'Field tracking'**
  String get fieldTracking;

  /// No description provided for @offlineSync.
  ///
  /// In en, this message translates to:
  /// **'Offline sync'**
  String get offlineSync;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @workTools.
  ///
  /// In en, this message translates to:
  /// **'Work tools'**
  String get workTools;

  /// No description provided for @todaysActivity.
  ///
  /// In en, this message translates to:
  /// **'Today’s activity'**
  String get todaysActivity;

  /// No description provided for @viewDetails.
  ///
  /// In en, this message translates to:
  /// **'View details'**
  String get viewDetails;

  /// No description provided for @readyWhenYouAre.
  ///
  /// In en, this message translates to:
  /// **'Ready when you are'**
  String get readyWhenYouAre;

  /// No description provided for @firstActivityHere.
  ///
  /// In en, this message translates to:
  /// **'Your first activity will appear here'**
  String get firstActivityHere;

  /// No description provided for @checkedInAt.
  ///
  /// In en, this message translates to:
  /// **'Checked in at {time}'**
  String checkedInAt(String time);

  /// No description provided for @checkedOutAt.
  ///
  /// In en, this message translates to:
  /// **'Checked out at {time}'**
  String checkedOutAt(String time);

  /// No description provided for @workingTimeTracked.
  ///
  /// In en, this message translates to:
  /// **'Working time is being tracked'**
  String get workingTimeTracked;

  /// No description provided for @leaveApp.
  ///
  /// In en, this message translates to:
  /// **'Leave the app?'**
  String get leaveApp;

  /// No description provided for @remainSignedIn.
  ///
  /// In en, this message translates to:
  /// **'You will remain signed in on this device.'**
  String get remainSignedIn;

  /// No description provided for @exit.
  ///
  /// In en, this message translates to:
  /// **'Exit'**
  String get exit;

  /// No description provided for @stay.
  ///
  /// In en, this message translates to:
  /// **'Stay'**
  String get stay;

  /// No description provided for @safeToClose.
  ///
  /// In en, this message translates to:
  /// **'You can safely close this window.'**
  String get safeToClose;

  /// No description provided for @cameraCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Check in'**
  String get cameraCheckIn;

  /// No description provided for @cameraCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Check out'**
  String get cameraCheckOut;

  /// No description provided for @preparingCamera.
  ///
  /// In en, this message translates to:
  /// **'Preparing secure camera…'**
  String get preparingCamera;

  /// No description provided for @cameraRequired.
  ///
  /// In en, this message translates to:
  /// **'Camera access is required to verify your identity.'**
  String get cameraRequired;

  /// No description provided for @cameraUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Camera is unavailable. Check access and try again.'**
  String get cameraUnavailable;

  /// No description provided for @centreFace.
  ///
  /// In en, this message translates to:
  /// **'Centre your face and look directly at the camera'**
  String get centreFace;

  /// No description provided for @verifyingFaceLocation.
  ///
  /// In en, this message translates to:
  /// **'Verifying face and location…'**
  String get verifyingFaceLocation;

  /// No description provided for @captureFailed.
  ///
  /// In en, this message translates to:
  /// **'Capture failed. Hold steady and try again.'**
  String get captureFailed;

  /// No description provided for @secureCapture.
  ///
  /// In en, this message translates to:
  /// **'SECURE CAPTURE'**
  String get secureCapture;

  /// No description provided for @initialising.
  ///
  /// In en, this message translates to:
  /// **'INITIALISING'**
  String get initialising;

  /// No description provided for @verificationEvidence.
  ///
  /// In en, this message translates to:
  /// **'Face match  •  Live location  •  Registered device'**
  String get verificationEvidence;

  /// No description provided for @verifyCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Verify and check in'**
  String get verifyCheckIn;

  /// No description provided for @verifyCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Verify and check out'**
  String get verifyCheckOut;

  /// No description provided for @tryCameraAgain.
  ///
  /// In en, this message translates to:
  /// **'Try camera again'**
  String get tryCameraAgain;

  /// No description provided for @verifyingAttendance.
  ///
  /// In en, this message translates to:
  /// **'Verifying your attendance'**
  String get verifyingAttendance;

  /// No description provided for @keepScreenOpen.
  ///
  /// In en, this message translates to:
  /// **'Keep this screen open. This usually takes only a moment.'**
  String get keepScreenOpen;

  /// No description provided for @secureVerification.
  ///
  /// In en, this message translates to:
  /// **'Secure verification in progress'**
  String get secureVerification;

  /// No description provided for @verificationInProgress.
  ///
  /// In en, this message translates to:
  /// **'Verification in progress'**
  String get verificationInProgress;

  /// No description provided for @verificationWait.
  ///
  /// In en, this message translates to:
  /// **'Please wait a moment while we securely verify this attendance punch.'**
  String get verificationWait;

  /// No description provided for @punchSuccessful.
  ///
  /// In en, this message translates to:
  /// **'Punch successful'**
  String get punchSuccessful;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @viewTimeline.
  ///
  /// In en, this message translates to:
  /// **'View today’s timeline'**
  String get viewTimeline;

  /// No description provided for @attendanceHistory.
  ///
  /// In en, this message translates to:
  /// **'Attendance history'**
  String get attendanceHistory;

  /// No description provided for @monthlySummary.
  ///
  /// In en, this message translates to:
  /// **'Monthly summary'**
  String get monthlySummary;

  /// No description provided for @dayDetail.
  ///
  /// In en, this message translates to:
  /// **'Day detail'**
  String get dayDetail;

  /// No description provided for @requestCorrection.
  ///
  /// In en, this message translates to:
  /// **'Request correction'**
  String get requestCorrection;

  /// No description provided for @regularizationRequest.
  ///
  /// In en, this message translates to:
  /// **'Regularization request'**
  String get regularizationRequest;

  /// No description provided for @correctionDetails.
  ///
  /// In en, this message translates to:
  /// **'Correction details'**
  String get correctionDetails;

  /// No description provided for @requestedCheckout.
  ///
  /// In en, this message translates to:
  /// **'Requested check-out'**
  String get requestedCheckout;

  /// No description provided for @selectTime.
  ///
  /// In en, this message translates to:
  /// **'Select time'**
  String get selectTime;

  /// No description provided for @reason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get reason;

  /// No description provided for @reasonHint.
  ///
  /// In en, this message translates to:
  /// **'Briefly explain what happened'**
  String get reasonHint;

  /// No description provided for @sendManager.
  ///
  /// In en, this message translates to:
  /// **'Send to manager'**
  String get sendManager;

  /// No description provided for @submitting.
  ///
  /// In en, this message translates to:
  /// **'Submitting…'**
  String get submitting;

  /// No description provided for @selectCheckoutTime.
  ///
  /// In en, this message translates to:
  /// **'Select the requested check-out time.'**
  String get selectCheckoutTime;

  /// No description provided for @reasonRequired.
  ///
  /// In en, this message translates to:
  /// **'Explain why the punch is missing'**
  String get reasonRequired;

  /// No description provided for @reasonMoreDetail.
  ///
  /// In en, this message translates to:
  /// **'Add a little more detail for your manager'**
  String get reasonMoreDetail;

  /// No description provided for @submitRequest.
  ///
  /// In en, this message translates to:
  /// **'Submit this request?'**
  String get submitRequest;

  /// No description provided for @submitRequestWarning.
  ///
  /// In en, this message translates to:
  /// **'Your manager will review the corrected time and reason. Submitted requests cannot be edited.'**
  String get submitRequestWarning;

  /// No description provided for @requestSent.
  ///
  /// In en, this message translates to:
  /// **'Regularization request sent to your manager.'**
  String get requestSent;

  /// No description provided for @myRequests.
  ///
  /// In en, this message translates to:
  /// **'My requests'**
  String get myRequests;

  /// No description provided for @pending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get pending;

  /// No description provided for @approved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get approved;

  /// No description provided for @rejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get rejected;

  /// No description provided for @registerDevice.
  ///
  /// In en, this message translates to:
  /// **'Register this device'**
  String get registerDevice;

  /// No description provided for @registerDeviceAction.
  ///
  /// In en, this message translates to:
  /// **'Register device'**
  String get registerDeviceAction;

  /// No description provided for @devicePolicy.
  ///
  /// In en, this message translates to:
  /// **'Attendance punches are only allowed from your registered device.'**
  String get devicePolicy;

  /// No description provided for @attendancePermissions.
  ///
  /// In en, this message translates to:
  /// **'Attendance permissions'**
  String get attendancePermissions;

  /// No description provided for @permissionsIntro.
  ///
  /// In en, this message translates to:
  /// **'Enable the capabilities used by your attendance policy. You stay in control and can change them later.'**
  String get permissionsIntro;

  /// No description provided for @continueAction.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueAction;

  /// No description provided for @faceConsent.
  ///
  /// In en, this message translates to:
  /// **'Face verification consent'**
  String get faceConsent;

  /// No description provided for @consentAgreement.
  ///
  /// In en, this message translates to:
  /// **'I agree to biometric verification'**
  String get consentAgreement;

  /// No description provided for @giveConsent.
  ///
  /// In en, this message translates to:
  /// **'Give consent'**
  String get giveConsent;

  /// No description provided for @declineGps.
  ///
  /// In en, this message translates to:
  /// **'Decline — use GPS only'**
  String get declineGps;

  /// No description provided for @faceEnrollment.
  ///
  /// In en, this message translates to:
  /// **'Face enrollment'**
  String get faceEnrollment;

  /// No description provided for @captureEnrollment.
  ///
  /// In en, this message translates to:
  /// **'Capture enrollment'**
  String get captureEnrollment;

  /// No description provided for @notificationsUnread.
  ///
  /// In en, this message translates to:
  /// **'{count} unread'**
  String notificationsUnread(int count);

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get markAllRead;

  /// No description provided for @allCaughtUp.
  ///
  /// In en, this message translates to:
  /// **'You’re all caught up.'**
  String get allCaughtUp;

  /// No description provided for @allRead.
  ///
  /// In en, this message translates to:
  /// **'All notifications marked as read.'**
  String get allRead;

  /// No description provided for @settingsPermissions.
  ///
  /// In en, this message translates to:
  /// **'Settings & permissions'**
  String get settingsPermissions;

  /// No description provided for @permissions.
  ///
  /// In en, this message translates to:
  /// **'Permissions'**
  String get permissions;

  /// No description provided for @preferences.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get preferences;

  /// No description provided for @checkInReminder.
  ///
  /// In en, this message translates to:
  /// **'Check-in reminder'**
  String get checkInReminder;

  /// No description provided for @checkOutReminder.
  ///
  /// In en, this message translates to:
  /// **'Check-out reminder'**
  String get checkOutReminder;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @english.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @arabic.
  ///
  /// In en, this message translates to:
  /// **'العربية'**
  String get arabic;

  /// No description provided for @unregisterDevice.
  ///
  /// In en, this message translates to:
  /// **'Unregister this device'**
  String get unregisterDevice;

  /// No description provided for @startTracking.
  ///
  /// In en, this message translates to:
  /// **'Start field tracking'**
  String get startTracking;

  /// No description provided for @stopTracking.
  ///
  /// In en, this message translates to:
  /// **'Stop field tracking'**
  String get stopTracking;

  /// No description provided for @trackingActive.
  ///
  /// In en, this message translates to:
  /// **'Field tracking is active'**
  String get trackingActive;

  /// No description provided for @trackingOff.
  ///
  /// In en, this message translates to:
  /// **'Field tracking is off'**
  String get trackingOff;

  /// No description provided for @syncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync now'**
  String get syncNow;

  /// No description provided for @everythingSynced.
  ///
  /// In en, this message translates to:
  /// **'Everything is synced'**
  String get everythingSynced;

  /// No description provided for @startBreak.
  ///
  /// In en, this message translates to:
  /// **'Start break'**
  String get startBreak;

  /// No description provided for @breakInProgress.
  ///
  /// In en, this message translates to:
  /// **'Break in progress'**
  String get breakInProgress;

  /// No description provided for @companyCode.
  ///
  /// In en, this message translates to:
  /// **'Employee ID'**
  String get companyCode;

  /// No description provided for @department.
  ///
  /// In en, this message translates to:
  /// **'Department'**
  String get department;

  /// No description provided for @manager.
  ///
  /// In en, this message translates to:
  /// **'Manager'**
  String get manager;

  /// No description provided for @office.
  ///
  /// In en, this message translates to:
  /// **'Office'**
  String get office;

  /// No description provided for @workPolicy.
  ///
  /// In en, this message translates to:
  /// **'Work policy'**
  String get workPolicy;

  /// No description provided for @timezone.
  ///
  /// In en, this message translates to:
  /// **'Timezone'**
  String get timezone;

  /// No description provided for @employeeStatus.
  ///
  /// In en, this message translates to:
  /// **'Employee status'**
  String get employeeStatus;

  /// No description provided for @active.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get active;

  /// No description provided for @weekOverview.
  ///
  /// In en, this message translates to:
  /// **'Week overview'**
  String get weekOverview;

  /// No description provided for @hoursWorked.
  ///
  /// In en, this message translates to:
  /// **'Hours worked'**
  String get hoursWorked;

  /// No description provided for @lateMinutes.
  ///
  /// In en, this message translates to:
  /// **'Late minutes'**
  String get lateMinutes;

  /// No description provided for @overtime.
  ///
  /// In en, this message translates to:
  /// **'Overtime'**
  String get overtime;

  /// No description provided for @locationStatus.
  ///
  /// In en, this message translates to:
  /// **'Location status'**
  String get locationStatus;

  /// No description provided for @insideOfficeZone.
  ///
  /// In en, this message translates to:
  /// **'Inside office zone'**
  String get insideOfficeZone;

  /// No description provided for @shiftProgress.
  ///
  /// In en, this message translates to:
  /// **'Shift progress'**
  String get shiftProgress;

  /// No description provided for @nextHoliday.
  ///
  /// In en, this message translates to:
  /// **'Next holiday'**
  String get nextHoliday;

  /// No description provided for @policySnapshot.
  ///
  /// In en, this message translates to:
  /// **'Policy snapshot'**
  String get policySnapshot;

  /// No description provided for @browserPermissionMode.
  ///
  /// In en, this message translates to:
  /// **'Browser permission mode'**
  String get browserPermissionMode;

  /// No description provided for @camera.
  ///
  /// In en, this message translates to:
  /// **'Camera'**
  String get camera;

  /// No description provided for @preciseLocation.
  ///
  /// In en, this message translates to:
  /// **'Precise location'**
  String get preciseLocation;

  /// No description provided for @backgroundLocation.
  ///
  /// In en, this message translates to:
  /// **'Background location'**
  String get backgroundLocation;

  /// No description provided for @batteryOptimization.
  ///
  /// In en, this message translates to:
  /// **'Battery optimization'**
  String get batteryOptimization;

  /// No description provided for @enable.
  ///
  /// In en, this message translates to:
  /// **'Enable'**
  String get enable;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @continueWithoutFace.
  ///
  /// In en, this message translates to:
  /// **'Continue without face verification?'**
  String get continueWithoutFace;

  /// No description provided for @continueWithoutFaceWarning.
  ///
  /// In en, this message translates to:
  /// **'Your attendance policy may require additional manager review when biometric verification is unavailable.'**
  String get continueWithoutFaceWarning;

  /// No description provided for @continueWithGps.
  ///
  /// In en, this message translates to:
  /// **'Continue with GPS'**
  String get continueWithGps;

  /// No description provided for @consentDataTitle.
  ///
  /// In en, this message translates to:
  /// **'What we store'**
  String get consentDataTitle;

  /// No description provided for @consentDataBody.
  ///
  /// In en, this message translates to:
  /// **'A face template generated from your enrollment photo.'**
  String get consentDataBody;

  /// No description provided for @consentUseTitle.
  ///
  /// In en, this message translates to:
  /// **'How it is used'**
  String get consentUseTitle;

  /// No description provided for @consentUseBody.
  ///
  /// In en, this message translates to:
  /// **'Attendance verification only. Deleted when your employment ends.'**
  String get consentUseBody;

  /// No description provided for @punchFailed.
  ///
  /// In en, this message translates to:
  /// **'Punch could not be completed'**
  String get punchFailed;

  /// No description provided for @failureStates.
  ///
  /// In en, this message translates to:
  /// **'Verification help'**
  String get failureStates;

  /// No description provided for @notifyBeforeShift.
  ///
  /// In en, this message translates to:
  /// **'Notify me shortly before my shift'**
  String get notifyBeforeShift;

  /// No description provided for @notifyShiftEnd.
  ///
  /// In en, this message translates to:
  /// **'Notify me near the end of my shift'**
  String get notifyShiftEnd;

  /// No description provided for @unregisterConfirm.
  ///
  /// In en, this message translates to:
  /// **'Unregister this device?'**
  String get unregisterConfirm;

  /// No description provided for @unregisterWarning.
  ///
  /// In en, this message translates to:
  /// **'Attendance punches will be blocked until HR approves a replacement device.'**
  String get unregisterWarning;

  /// No description provided for @unregisterAction.
  ///
  /// In en, this message translates to:
  /// **'Unregister device'**
  String get unregisterAction;

  /// No description provided for @deviceUnregistered.
  ///
  /// In en, this message translates to:
  /// **'Device unregistered'**
  String get deviceUnregistered;

  /// No description provided for @notificationApproved.
  ///
  /// In en, this message translates to:
  /// **'Your regularization was approved'**
  String get notificationApproved;

  /// No description provided for @notificationShiftEnd.
  ///
  /// In en, this message translates to:
  /// **'Your shift ends in 15 minutes'**
  String get notificationShiftEnd;

  /// No description provided for @notificationOfficeZone.
  ///
  /// In en, this message translates to:
  /// **'You entered the office zone'**
  String get notificationOfficeZone;

  /// No description provided for @notificationSynced.
  ///
  /// In en, this message translates to:
  /// **'Offline punch synced successfully'**
  String get notificationSynced;

  /// No description provided for @recentDays.
  ///
  /// In en, this message translates to:
  /// **'Recent days'**
  String get recentDays;

  /// No description provided for @present.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get present;

  /// No description provided for @late.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get late;

  /// No description provided for @absent.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get absent;

  /// No description provided for @leave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get leave;

  /// No description provided for @worked.
  ///
  /// In en, this message translates to:
  /// **'Worked'**
  String get worked;

  /// No description provided for @distance.
  ///
  /// In en, this message translates to:
  /// **'Distance'**
  String get distance;

  /// No description provided for @pings.
  ///
  /// In en, this message translates to:
  /// **'Pings'**
  String get pings;

  /// No description provided for @stops.
  ///
  /// In en, this message translates to:
  /// **'Stops'**
  String get stops;

  /// No description provided for @captureGuidance.
  ///
  /// In en, this message translates to:
  /// **'Centre your face → Blink slowly → Hold still'**
  String get captureGuidance;

  /// No description provided for @faceDeviceVerified.
  ///
  /// In en, this message translates to:
  /// **'Face, device and location verified'**
  String get faceDeviceVerified;

  /// No description provided for @breakLabel.
  ///
  /// In en, this message translates to:
  /// **'Break'**
  String get breakLabel;

  /// No description provided for @checkoutLabel.
  ///
  /// In en, this message translates to:
  /// **'Check-out'**
  String get checkoutLabel;

  /// No description provided for @checkinLabel.
  ///
  /// In en, this message translates to:
  /// **'Check-in'**
  String get checkinLabel;

  /// No description provided for @cameraRationale.
  ///
  /// In en, this message translates to:
  /// **'Required for liveness and face verification during a punch.'**
  String get cameraRationale;

  /// No description provided for @locationRationale.
  ///
  /// In en, this message translates to:
  /// **'Confirms you are inside an assigned office or field location.'**
  String get locationRationale;

  /// No description provided for @backgroundLocationRationale.
  ///
  /// In en, this message translates to:
  /// **'Used only during an active field shift to record scheduled route pings.'**
  String get backgroundLocationRationale;

  /// No description provided for @notificationRationale.
  ///
  /// In en, this message translates to:
  /// **'Delivers shift reminders, approvals, sync results, and security notices.'**
  String get notificationRationale;

  /// No description provided for @batteryRationale.
  ///
  /// In en, this message translates to:
  /// **'Allows reliable scheduled tracking while a field shift is active.'**
  String get batteryRationale;

  /// No description provided for @allowed.
  ///
  /// In en, this message translates to:
  /// **'Allowed'**
  String get allowed;

  /// No description provided for @limited.
  ///
  /// In en, this message translates to:
  /// **'Limited'**
  String get limited;

  /// No description provided for @notAllowed.
  ///
  /// In en, this message translates to:
  /// **'Not allowed'**
  String get notAllowed;

  /// No description provided for @openSettings.
  ///
  /// In en, this message translates to:
  /// **'Open settings'**
  String get openSettings;

  /// No description provided for @restricted.
  ///
  /// In en, this message translates to:
  /// **'Restricted'**
  String get restricted;

  /// No description provided for @notAvailable.
  ///
  /// In en, this message translates to:
  /// **'Not available on this platform'**
  String get notAvailable;

  /// No description provided for @missingCheckout.
  ///
  /// In en, this message translates to:
  /// **'Missing check-out'**
  String get missingCheckout;

  /// No description provided for @requestsSevenDays.
  ///
  /// In en, this message translates to:
  /// **'Requests are allowed within 7 days'**
  String get requestsSevenDays;

  /// No description provided for @deviceIssue.
  ///
  /// In en, this message translates to:
  /// **'Device issue'**
  String get deviceIssue;

  /// No description provided for @privacyPolicy.
  ///
  /// In en, this message translates to:
  /// **'Privacy policy'**
  String get privacyPolicy;

  /// No description provided for @licenses.
  ///
  /// In en, this message translates to:
  /// **'Licenses'**
  String get licenses;

  /// No description provided for @yesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get yesterday;

  /// No description provided for @monday.
  ///
  /// In en, this message translates to:
  /// **'Monday'**
  String get monday;

  /// No description provided for @verificationEvidenceTitle.
  ///
  /// In en, this message translates to:
  /// **'Verification evidence'**
  String get verificationEvidenceTitle;

  /// No description provided for @faceLiveness.
  ///
  /// In en, this message translates to:
  /// **'Face & liveness'**
  String get faceLiveness;

  /// No description provided for @registeredDevice.
  ///
  /// In en, this message translates to:
  /// **'Registered device'**
  String get registeredDevice;

  /// No description provided for @integrity.
  ///
  /// In en, this message translates to:
  /// **'Integrity'**
  String get integrity;

  /// No description provided for @verified.
  ///
  /// In en, this message translates to:
  /// **'Verified'**
  String get verified;

  /// No description provided for @passed.
  ///
  /// In en, this message translates to:
  /// **'Passed'**
  String get passed;

  /// No description provided for @payrollStatus.
  ///
  /// In en, this message translates to:
  /// **'Payroll status'**
  String get payrollStatus;

  /// No description provided for @open.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get open;

  /// No description provided for @correctionsAllowed.
  ///
  /// In en, this message translates to:
  /// **'Corrections allowed until 23 July'**
  String get correctionsAllowed;

  /// No description provided for @all.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get all;

  /// No description provided for @requestsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} requests'**
  String requestsCount(int count);

  /// No description provided for @shiftCorrection.
  ///
  /// In en, this message translates to:
  /// **'Shift correction'**
  String get shiftCorrection;

  /// No description provided for @minutesValue.
  ///
  /// In en, this message translates to:
  /// **'{count} minutes'**
  String minutesValue(int count);

  /// No description provided for @savedOfflineSynced.
  ///
  /// In en, this message translates to:
  /// **'Saved offline · synced successfully'**
  String get savedOfflineSynced;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}

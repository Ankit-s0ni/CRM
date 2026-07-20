// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'عمليات الموظفين';

  @override
  String get signInTitle => 'يوم عملك، منظم بكل سهولة.';

  @override
  String get signInSubtitle =>
      'الحضور والمناوبات والطلبات في مساحة عمل آمنة واحدة.';

  @override
  String get workEmail => 'البريد الإلكتروني للعمل';

  @override
  String get emailHint => 'name@company.com';

  @override
  String get password => 'كلمة المرور';

  @override
  String get forgotPassword => 'هل نسيت كلمة المرور؟';

  @override
  String get signInSecurely => 'تسجيل الدخول بأمان';

  @override
  String get signingIn => 'جارٍ تسجيل الدخول…';

  @override
  String get emailRequired => 'أدخل بريد العمل الإلكتروني';

  @override
  String get passwordRequired => 'أدخل كلمة المرور';

  @override
  String get resetPassword => 'إعادة تعيين كلمة المرور';

  @override
  String get resetPasswordHelp =>
      'تواصل مع مسؤول الموارد البشرية لإعادة تعيين كلمة مرور حسابك.';

  @override
  String get gotIt => 'حسنًا';

  @override
  String get protectedWorkspace => 'مساحة عمل محمية للموظفين';

  @override
  String get checkingSession => 'جارٍ التحقق من الجلسة…';

  @override
  String get goodMorning => 'صباح الخير';

  @override
  String get today => 'اليوم';

  @override
  String get todaysShift => 'مناوبة اليوم';

  @override
  String get onSchedule => 'في الموعد';

  @override
  String get checkInToday => 'تسجيل الحضور اليوم';

  @override
  String get checkOutToday => 'تسجيل الانصراف اليوم';

  @override
  String get history => 'السجل';

  @override
  String get attendance => 'الحضور';

  @override
  String get requests => 'الطلبات';

  @override
  String get profile => 'الملف الشخصي';

  @override
  String get notifications => 'الإشعارات';

  @override
  String get more => 'المزيد';

  @override
  String get takeBreak => 'بدء استراحة';

  @override
  String get endBreak => 'إنهاء الاستراحة';

  @override
  String get fieldTracking => 'التتبع الميداني';

  @override
  String get offlineSync => 'المزامنة دون اتصال';

  @override
  String get settings => 'الإعدادات';

  @override
  String get workTools => 'أدوات العمل';

  @override
  String get todaysActivity => 'نشاط اليوم';

  @override
  String get viewDetails => 'عرض التفاصيل';

  @override
  String get readyWhenYouAre => 'جاهز عندما تكون مستعدًا';

  @override
  String get firstActivityHere => 'سيظهر أول نشاط لك هنا';

  @override
  String checkedInAt(String time) {
    return 'تم تسجيل الحضور في $time';
  }

  @override
  String checkedOutAt(String time) {
    return 'تم تسجيل الانصراف في $time';
  }

  @override
  String get workingTimeTracked => 'يتم الآن احتساب وقت العمل';

  @override
  String get leaveApp => 'مغادرة التطبيق؟';

  @override
  String get remainSignedIn => 'ستظل مسجل الدخول على هذا الجهاز.';

  @override
  String get exit => 'خروج';

  @override
  String get stay => 'البقاء';

  @override
  String get safeToClose => 'يمكنك إغلاق هذه النافذة بأمان.';

  @override
  String get cameraCheckIn => 'تسجيل الحضور';

  @override
  String get cameraCheckOut => 'تسجيل الانصراف';

  @override
  String get preparingCamera => 'جارٍ تجهيز الكاميرا الآمنة…';

  @override
  String get cameraRequired => 'يلزم السماح بالكاميرا للتحقق من هويتك.';

  @override
  String get cameraUnavailable =>
      'الكاميرا غير متاحة. تحقق من الإذن وحاول مجددًا.';

  @override
  String get centreFace => 'ضع وجهك في المنتصف وانظر مباشرة إلى الكاميرا';

  @override
  String get verifyingFaceLocation => 'جارٍ التحقق من الوجه والموقع…';

  @override
  String get captureFailed => 'فشل الالتقاط. اثبت وحاول مرة أخرى.';

  @override
  String get secureCapture => 'التقاط آمن';

  @override
  String get initialising => 'جارٍ التجهيز';

  @override
  String get verificationEvidence =>
      'مطابقة الوجه  •  الموقع المباشر  •  الجهاز المسجل';

  @override
  String get verifyCheckIn => 'التحقق وتسجيل الحضور';

  @override
  String get verifyCheckOut => 'التحقق وتسجيل الانصراف';

  @override
  String get tryCameraAgain => 'إعادة محاولة الكاميرا';

  @override
  String get verifyingAttendance => 'جارٍ التحقق من الحضور';

  @override
  String get keepScreenOpen => 'أبقِ هذه الشاشة مفتوحة. يستغرق ذلك لحظات فقط.';

  @override
  String get secureVerification => 'التحقق الآمن قيد التنفيذ';

  @override
  String get verificationInProgress => 'التحقق قيد التنفيذ';

  @override
  String get verificationWait =>
      'يرجى الانتظار بينما نتحقق من عملية الحضور بأمان.';

  @override
  String get punchSuccessful => 'تمت العملية بنجاح';

  @override
  String get done => 'تم';

  @override
  String get viewTimeline => 'عرض الخط الزمني لليوم';

  @override
  String get attendanceHistory => 'سجل الحضور';

  @override
  String get monthlySummary => 'ملخص الشهر';

  @override
  String get dayDetail => 'تفاصيل اليوم';

  @override
  String get requestCorrection => 'طلب تصحيح';

  @override
  String get regularizationRequest => 'طلب تصحيح الحضور';

  @override
  String get correctionDetails => 'تفاصيل التصحيح';

  @override
  String get requestedCheckout => 'وقت الانصراف المطلوب';

  @override
  String get selectTime => 'اختر الوقت';

  @override
  String get reason => 'السبب';

  @override
  String get reasonHint => 'اشرح بإيجاز ما حدث';

  @override
  String get sendManager => 'إرسال إلى المدير';

  @override
  String get submitting => 'جارٍ الإرسال…';

  @override
  String get selectCheckoutTime => 'اختر وقت الانصراف المطلوب.';

  @override
  String get reasonRequired => 'اشرح سبب فقدان تسجيل الحضور';

  @override
  String get reasonMoreDetail => 'أضف مزيدًا من التفاصيل لمديرك';

  @override
  String get submitRequest => 'إرسال هذا الطلب؟';

  @override
  String get submitRequestWarning =>
      'سيراجع مديرك الوقت المصحح والسبب. لا يمكن تعديل الطلب بعد إرساله.';

  @override
  String get requestSent => 'تم إرسال طلب التصحيح إلى مديرك.';

  @override
  String get myRequests => 'طلباتي';

  @override
  String get pending => 'قيد الانتظار';

  @override
  String get approved => 'مقبول';

  @override
  String get rejected => 'مرفوض';

  @override
  String get registerDevice => 'تسجيل هذا الجهاز';

  @override
  String get registerDeviceAction => 'تسجيل الجهاز';

  @override
  String get devicePolicy => 'لا يُسمح بعمليات الحضور إلا من جهازك المسجل.';

  @override
  String get attendancePermissions => 'أذونات الحضور';

  @override
  String get permissionsIntro =>
      'فعّل الإمكانات المطلوبة وفق سياسة الحضور. يمكنك تغييرها لاحقًا.';

  @override
  String get continueAction => 'متابعة';

  @override
  String get faceConsent => 'الموافقة على التحقق بالوجه';

  @override
  String get consentAgreement => 'أوافق على التحقق الحيوي';

  @override
  String get giveConsent => 'منح الموافقة';

  @override
  String get declineGps => 'رفض — استخدام الموقع فقط';

  @override
  String get faceEnrollment => 'تسجيل الوجه';

  @override
  String get captureEnrollment => 'التقاط صورة التسجيل';

  @override
  String notificationsUnread(int count) {
    return '$count غير مقروء';
  }

  @override
  String get markAllRead => 'تحديد الكل كمقروء';

  @override
  String get allCaughtUp => 'لا توجد إشعارات جديدة.';

  @override
  String get allRead => 'تم تحديد جميع الإشعارات كمقروءة.';

  @override
  String get settingsPermissions => 'الإعدادات والأذونات';

  @override
  String get permissions => 'الأذونات';

  @override
  String get preferences => 'التفضيلات';

  @override
  String get checkInReminder => 'تذكير الحضور';

  @override
  String get checkOutReminder => 'تذكير الانصراف';

  @override
  String get language => 'اللغة';

  @override
  String get english => 'English';

  @override
  String get arabic => 'العربية';

  @override
  String get unregisterDevice => 'إلغاء تسجيل هذا الجهاز';

  @override
  String get startTracking => 'بدء التتبع الميداني';

  @override
  String get stopTracking => 'إيقاف التتبع الميداني';

  @override
  String get trackingActive => 'التتبع الميداني نشط';

  @override
  String get trackingOff => 'التتبع الميداني متوقف';

  @override
  String get syncNow => 'المزامنة الآن';

  @override
  String get everythingSynced => 'تمت مزامنة كل البيانات';

  @override
  String get startBreak => 'بدء الاستراحة';

  @override
  String get breakInProgress => 'الاستراحة قيد التنفيذ';

  @override
  String get companyCode => 'الرقم الوظيفي';

  @override
  String get department => 'القسم';

  @override
  String get manager => 'المدير';

  @override
  String get office => 'المكتب';

  @override
  String get workPolicy => 'سياسة العمل';

  @override
  String get timezone => 'المنطقة الزمنية';

  @override
  String get employeeStatus => 'حالة الموظف';

  @override
  String get active => 'نشط';

  @override
  String get weekOverview => 'نظرة عامة على الأسبوع';

  @override
  String get hoursWorked => 'ساعات العمل';

  @override
  String get lateMinutes => 'دقائق التأخير';

  @override
  String get overtime => 'الوقت الإضافي';

  @override
  String get locationStatus => 'حالة الموقع';

  @override
  String get insideOfficeZone => 'داخل نطاق المكتب';

  @override
  String get shiftProgress => 'تقدم المناوبة';

  @override
  String get nextHoliday => 'العطلة القادمة';

  @override
  String get policySnapshot => 'ملخص السياسة';

  @override
  String get browserPermissionMode => 'وضع أذونات المتصفح';

  @override
  String get camera => 'الكاميرا';

  @override
  String get preciseLocation => 'الموقع الدقيق';

  @override
  String get backgroundLocation => 'الموقع في الخلفية';

  @override
  String get batteryOptimization => 'تحسين البطارية';

  @override
  String get enable => 'تفعيل';

  @override
  String get retry => 'إعادة المحاولة';

  @override
  String get continueWithoutFace => 'المتابعة دون التحقق بالوجه؟';

  @override
  String get continueWithoutFaceWarning =>
      'قد تتطلب سياسة الحضور مراجعة إضافية من المدير عند عدم توفر التحقق الحيوي.';

  @override
  String get continueWithGps => 'المتابعة باستخدام الموقع';

  @override
  String get consentDataTitle => 'ما نقوم بتخزينه';

  @override
  String get consentDataBody => 'قالب للوجه يتم إنشاؤه من صورة التسجيل.';

  @override
  String get consentUseTitle => 'كيفية استخدامه';

  @override
  String get consentUseBody =>
      'للتحقق من الحضور فقط، ويتم حذفه عند انتهاء التوظيف.';

  @override
  String get punchFailed => 'تعذر إكمال عملية الحضور';

  @override
  String get failureStates => 'مساعدة التحقق';

  @override
  String get notifyBeforeShift => 'إشعاري قبل بدء المناوبة بقليل';

  @override
  String get notifyShiftEnd => 'إشعاري قرب نهاية المناوبة';

  @override
  String get unregisterConfirm => 'إلغاء تسجيل هذا الجهاز؟';

  @override
  String get unregisterWarning =>
      'سيتم منع عمليات الحضور حتى توافق الموارد البشرية على جهاز بديل.';

  @override
  String get unregisterAction => 'إلغاء تسجيل الجهاز';

  @override
  String get deviceUnregistered => 'تم إلغاء تسجيل الجهاز';

  @override
  String get notificationApproved => 'تمت الموافقة على طلب تصحيح الحضور';

  @override
  String get notificationShiftEnd => 'تنتهي مناوبتك خلال 15 دقيقة';

  @override
  String get notificationOfficeZone => 'دخلت نطاق المكتب';

  @override
  String get notificationSynced => 'تمت مزامنة عملية الحضور دون اتصال';

  @override
  String get recentDays => 'الأيام الأخيرة';

  @override
  String get present => 'حاضر';

  @override
  String get late => 'متأخر';

  @override
  String get absent => 'غائب';

  @override
  String get leave => 'إجازة';

  @override
  String get worked => 'ساعات العمل';

  @override
  String get distance => 'المسافة';

  @override
  String get pings => 'نقاط الموقع';

  @override
  String get stops => 'التوقفات';

  @override
  String get captureGuidance => 'ضع وجهك في المنتصف ← ارمش ببطء ← اثبت';

  @override
  String get faceDeviceVerified => 'تم التحقق من الوجه والجهاز والموقع';

  @override
  String get breakLabel => 'استراحة';

  @override
  String get checkoutLabel => 'تسجيل الانصراف';

  @override
  String get checkinLabel => 'تسجيل الحضور';

  @override
  String get cameraRationale =>
      'مطلوبة للتحقق من الحيوية والوجه أثناء عملية الحضور.';

  @override
  String get locationRationale =>
      'تؤكد وجودك داخل المكتب أو موقع العمل الميداني المحدد.';

  @override
  String get backgroundLocationRationale =>
      'تُستخدم فقط أثناء المناوبة الميدانية النشطة لتسجيل نقاط المسار المجدولة.';

  @override
  String get notificationRationale =>
      'ترسل تذكيرات المناوبة والموافقات ونتائج المزامنة والتنبيهات الأمنية.';

  @override
  String get batteryRationale =>
      'تسمح بتتبع مجدول وموثوق أثناء المناوبة الميدانية النشطة.';

  @override
  String get allowed => 'مسموح';

  @override
  String get limited => 'محدود';

  @override
  String get notAllowed => 'غير مسموح';

  @override
  String get openSettings => 'فتح الإعدادات';

  @override
  String get restricted => 'مقيّد';

  @override
  String get notAvailable => 'غير متاح على هذه المنصة';

  @override
  String get missingCheckout => 'تسجيل الانصراف مفقود';

  @override
  String get requestsSevenDays => 'يُسمح بالطلبات خلال 7 أيام';

  @override
  String get deviceIssue => 'مشكلة في الجهاز';

  @override
  String get privacyPolicy => 'سياسة الخصوصية';

  @override
  String get licenses => 'التراخيص';

  @override
  String get yesterday => 'أمس';

  @override
  String get monday => 'الاثنين';

  @override
  String get verificationEvidenceTitle => 'أدلة التحقق';

  @override
  String get faceLiveness => 'الوجه والحيوية';

  @override
  String get registeredDevice => 'الجهاز المسجل';

  @override
  String get integrity => 'سلامة الجهاز';

  @override
  String get verified => 'تم التحقق';

  @override
  String get passed => 'ناجح';

  @override
  String get payrollStatus => 'حالة مسير الرواتب';

  @override
  String get open => 'مفتوح';

  @override
  String get correctionsAllowed => 'التصحيحات متاحة حتى 23 يوليو';

  @override
  String get all => 'الكل';

  @override
  String requestsCount(int count) {
    return '$count طلبات';
  }

  @override
  String get shiftCorrection => 'تصحيح المناوبة';

  @override
  String minutesValue(int count) {
    return '$count دقيقة';
  }

  @override
  String get savedOfflineSynced => 'حُفظ دون اتصال · تمت المزامنة بنجاح';

  @override
  String get logout => 'تسجيل الخروج';

  @override
  String get logoutConfirmTitle => 'تسجيل الخروج من DeltCRM؟';

  @override
  String get logoutConfirmMessage =>
      'ستحتاج إلى إدخال بريدك الإلكتروني وكلمة المرور لتسجيل الدخول مرة أخرى.';
}

import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cookies, headers } from "next/headers";
import type { AppLanguage } from "./routing";

const NAMESPACES = [
  "common",
  "tenant-shell",
  "tenant-navigation",
  "tenant-dashboard",
  "attendance-status",
  "errors",
  "attendance-ui",
  "organization-ui",
  "settings-ui",
  "shared-ui",
  "tenant-ui",
].join(",");

type LocalizationBootstrap = {
  policy: {
    defaultLanguage: AppLanguage;
    enabledLanguages: AppLanguage[];
    allowUserPreference: boolean;
    regionalArabicLocale: "ar" | "ar-OM" | "ar-AE";
    catalogVersion: number;
  };
  catalog: {
    language: AppLanguage;
    resolvedLocale: "en" | "ar" | "ar-OM" | "ar-AE";
    direction: "ltr" | "rtl";
    version: number;
    messages: Record<string, string>;
  };
};

export async function getTenantLocalizationBootstrap(
  language: AppLanguage,
): Promise<LocalizationBootstrap | null> {
  const workspace = await resolveWorkspace();
  if (!workspace) return developmentLocalizationBootstrap(language);

  const baseUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4001";
  const url = new URL("/public/localization/bootstrap", baseUrl);
  url.searchParams.set("subdomain", workspace);
  url.searchParams.set("language", language);
  url.searchParams.set("namespaces", NAMESPACES);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: LocalizationBootstrap | null;
    };
    return mergeDevelopmentCatalog(payload.data ?? null, language);
  } catch {
    return developmentLocalizationBootstrap(language);
  }
}

export function nestMessages(flatMessages: Record<string, string>) {
  const nested: Record<string, unknown> = {};
  for (const [key, message] of Object.entries(flatMessages)) {
    const segments = key.split(".");
    let cursor = nested;
    for (const segment of segments.slice(0, -1)) {
      const existing = cursor[segment];
      if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }
    cursor[segments.at(-1)!] = message;
  }
  return nested;
}

async function resolveWorkspace() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0];
  const host = (forwardedHost ?? requestHeaders.get("host") ?? "")
    .trim()
    .split(":")[0]
    .toLowerCase();
  const appDomain = (
    process.env.NEXT_PUBLIC_APP_DOMAIN ?? "your-domain.com"
  ).toLowerCase();
  const reserved = new Set(["www", "app", "api"]);

  if (host.endsWith(`.${appDomain}`)) {
    const subdomain = host.slice(0, -(appDomain.length + 1));
    if (
      !reserved.has(subdomain) &&
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)
    ) {
      return subdomain;
    }
  }

  if (host === "localhost" || host === "127.0.0.1") {
    const workspace = (await cookies()).get("deltcrm-workspace")?.value ?? "";
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(workspace)
      ? workspace
      : null;
  }
  return null;
}

function mergeDevelopmentCatalog(
  bootstrap: LocalizationBootstrap | null,
  language: AppLanguage,
) {
  if (!bootstrap || process.env.NODE_ENV === "production" || language !== "ar") {
    return bootstrap;
  }
  return {
    ...bootstrap,
    catalog: {
      ...bootstrap.catalog,
      messages: {
        ...bootstrap.catalog.messages,
        ...developmentArabicMessages(),
      },
    },
  };
}

function developmentLocalizationBootstrap(
  language: AppLanguage,
): LocalizationBootstrap | null {
  if (process.env.NODE_ENV === "production") return null;
  const messages =
    language === "ar"
      ? developmentArabicMessages()
      : developmentEnglishMessages();
  return {
    policy: {
      defaultLanguage: "en",
      enabledLanguages: ["en", "ar"],
      allowUserPreference: true,
      regionalArabicLocale: "ar",
      catalogVersion: 1,
    },
    catalog: {
      language,
      resolvedLocale: language,
      direction: language === "ar" ? "rtl" : "ltr",
      version: 1,
      messages,
    },
  };
}

function developmentEnglishMessages() {
  return Object.fromEntries(
    readTenantUiSourceEntries().map((entry) => [
      entry.key,
      entry.defaultMessage,
    ]),
  );
}

function developmentArabicMessages() {
  const sourceByKey = new Map(
    readTenantUiSourceEntries().map((entry) => [entry.key, entry.defaultMessage]),
  );
  return {
    ...developmentBaseArabicMessages,
    ...Object.fromEntries(
      readTenantUiArabicTranslations()
        .filter((translation) => translation.value.trim())
        .map((translation) => [
          translation.key,
          translation.value.trim() || sourceByKey.get(translation.key) || "",
        ]),
    ),
  };
}

function readTenantUiSourceEntries(): Array<{
  key: string;
  defaultMessage: string;
}> {
  return readLocalizationJson<{ entries?: Array<{ key: string; defaultMessage: string }> }>(
    "tenant-ui.source.json",
  )?.entries ?? [];
}

function readTenantUiArabicTranslations(): Array<{
  key: string;
  value: string;
}> {
  return readLocalizationJson<{ translations?: Array<{ key: string; value: string }> }>(
    "tenant-ui.ar.json",
  )?.translations ?? [];
}

function readLocalizationJson<T>(fileName: string): T | null {
  const candidates = [
    resolve(process.cwd(), "localization", fileName),
    resolve(process.cwd(), "..", "..", "localization", fileName),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

const developmentBaseArabicMessages: Record<string, string> = {
  "common.action.save": "حفظ",
  "common.action.saveChanges": "حفظ التغييرات",
  "common.state.saving": "جار الحفظ...",
  "tenant.shell.workspace": "مساحة عمل DeltCRM",
  "tenant.shell.logout": "تسجيل الخروج",
  "tenant.shell.notifications": "الإشعارات",
  "tenant.shell.openNavigation": "فتح التنقل",
  "tenant.shell.closeNavigation": "إغلاق التنقل",
  "tenant.shell.expandNavigation": "توسيع التنقل",
  "tenant.shell.collapseNavigation": "طي التنقل",
  "tenant.shell.workspaceUser": "مستخدم مساحة العمل",
  "tenant.shell.mainNavigation": "التنقل الرئيسي",
  "tenant.shell.skipToContent": "الانتقال إلى المحتوى الرئيسي",
  "tenant.navigation.dashboard": "لوحة المعلومات",
  "tenant.navigation.employees": "الموظفون",
  "tenant.navigation.modules": "الوحدات",
  "tenant.navigation.reports": "التقارير",
  "tenant.navigation.settings": "الإعدادات",
  "tenant.navigation.settingsHome": "الصفحة الرئيسية للإعدادات",
  "tenant.localization.title": "اللغة والتوطين",
  "tenant.dashboard.role.owner": "مركز قيادة المالك",
  "tenant.dashboard.role.ownerBody": "رتّب أولوية صحة الإعداد والوصول والوحدات والتقارير.",
  "tenant.dashboard.role.modules": "الوحدات",
  "tenant.dashboard.role.access": "الأدوار والوصول",
  "tenant.dashboard.role.reports": "التقارير",
  "tenant.dashboard.role.manager": "قائمة مراجعة المدير",
  "tenant.dashboard.role.managerBody": "راجع استثناءات الحضور وموافقات الإجازات وحالة اليوم.",
  "tenant.dashboard.role.regularizations": "التصحيحات",
  "tenant.dashboard.role.leaveApprovals": "موافقات الإجازات",
  "tenant.dashboard.role.register": "سجل الحضور",
  "tenant.dashboard.role.payroll": "مساحة عمل الرواتب",
  "tenant.dashboard.role.payrollBody": "انتقل من مؤشرات القوى العاملة إلى تشغيل الرواتب والصادرات والتقارير.",
  "tenant.dashboard.role.payrollRuns": "تشغيل الرواتب",
  "tenant.dashboard.role.exports": "الصادرات",
  "tenant.dashboard.role.payrollReports": "تقارير الرواتب",
  "tenant.dashboard.role.hr": "عمليات الموارد البشرية",
  "tenant.dashboard.role.hrBody": "استخدم سجلات الموظفين والحضور وقوائم الإجازات من مكان واحد.",
  "tenant.dashboard.role.employees": "الموظفون",
  "tenant.dashboard.role.attendance": "الحضور",
  "tenant.dashboard.role.leave": "الإجازات",
  "tenant.dashboard.role.roleAware": "حسب الدور",
  "tenant.dashboard.header.eyebrow": "عمليات مساحة العمل",
  "tenant.dashboard.header.title": "عمليات الموارد البشرية",
  "tenant.dashboard.header.welcome": "مرحبًا، {name}. راجع قوى العمل اليوم وكل قائمة تتطلب إجراء.",
  "tenant.dashboard.connecting": "جار الاتصال بلوحة العمل المباشرة...",
  "common.state.live": "مباشر",
  "common.state.stale": "قد تكون البيانات قديمة",
  "common.state.updatedSecondsAgo": "تم التحديث منذ {seconds} ث",
  "attendance.status.all": "جميع الموظفين",
  "attendance.status.present": "حاضر",
  "attendance.status.clockedIn": "تم تسجيل الدخول",
  "attendance.status.late": "متأخر",
  "attendance.status.absent": "غائب",
  "attendance.status.onField": "في الميدان",
  "attendance.status.onBreak": "في استراحة",
  "attendance.status.notYetIn": "لم يحضر بعد",
  "attendance.status.off": "متوقف",
  "tenant.dashboard.search.label": "البحث في الموظفين",
  "tenant.dashboard.search.placeholder": "ابحث عن موظفين...",
  "tenant.search.placeholder": "ابحث عن أشخاص أو صفحات أو إعدادات...",
  "tenant.search.shortcut": "اختصار البحث",
  "tenant.dashboard.empty.title": "لا يوجد موظفون مطابقون لهذا العرض",
  "tenant.dashboard.empty.body": "جرّب حالة أخرى أو امسح البحث.",
  "tenant.dashboard.attention.title": "يتطلب اهتمامك",
  "tenant.dashboard.attention.subtitle": "قوائم تشغيلية مباشرة",
  "tenant.dashboard.attention.regularizations": "طلبات تصحيح الحضور المعلقة",
  "tenant.dashboard.attention.awaitingReview": "طلبات بانتظار المراجعة",
  "tenant.dashboard.attention.security": "مخالفات الأمان",
  "tenant.dashboard.attention.openAlerts": "تنبيهات مفتوحة أو تم الإقرار بها",
  "tenant.dashboard.attention.absentee": "تنبيهات الغياب",
  "tenant.dashboard.attention.pastGrace": "موظفون تجاوزوا مهلة التنبيه",
  "tenant.dashboard.attention.leave": "طلبات الإجازة",
  "tenant.dashboard.attention.awaitingDecision": "طلبات بانتظار قرار",
  "tenant.dashboard.attention.devices": "الأجهزة الموثوقة",
  "tenant.dashboard.attention.awaitingApproval": "أجهزة بانتظار الموافقة",
  "tenant.dashboard.attention.none": "لا توجد قوائم تتطلب إجراء الآن.",
  "tenant.dashboard.attention.openRegister": "فتح سجل الحضور",
  "tenant.dashboard.view.grid": "عرض شبكي",
  "tenant.dashboard.view.list": "عرض قائمة",
  "tenant.dashboard.employee.openProfile": "فتح ملف الموظف",
  "tenant.dashboard.employee.checkedInAt": "تسجيل الدخول {time}",
  "tenant.dashboard.employee.noCheckin": "لا يوجد تسجيل دخول",
  "tenant.dashboard.employee.noShift": "لا توجد مناوبة",
  "tenant.ui.configuration.health.26f3ce6d": "صحة التهيئة",
  "tenant.ui.generate.a.payroll.export.before.locking.the.first.4321cb8f": "أنشئ تصديرًا للرواتب قبل إغلاق الشهر الأول.",
  "tenant.ui.generate.and.download.a.snapshot.based.payroll.csv.f4558fc4": "أنشئ وحمّل ملف رواتب CSV مبنيًا على لقطة لفترة محددة.",
  "tenant.ui.generate.the.period.export.before.attempting.to.close.7e6a79b5": "أنشئ تصدير الفترة قبل محاولة إغلاقها.",
  "tenant.ui.lock.a.completed.month.against.its.export.or.7f64dd3d": "أغلق شهرًا مكتملًا مقابل تصديره أو أعد فتحه بسبب موثق.",
  "tenant.ui.review.the.attendance.and.leave.inputs.that.determine.507e019c": "راجع مدخلات الحضور والإجازات التي تحدد أدلة الرواتب.",
  "tenant.ui.modules.04e9462c": "الوحدات",
  "tenant.ui.open.configuration.1760c989": "فتح التهيئة",
  "tenant.ui.payroll.exports.4a8439dd": "صادرات الرواتب",
  "tenant.ui.period.close.86491a38": "إغلاق الفترة",
  "tenant.ui.readiness.and.dependencies.d8cab331": "الجاهزية والاعتمادات",
  "tenant.ui.reports.88bc3fe3": "التقارير",
  "tenant.ui.ready.01d6dd2f": "جاهز",
  "tenant.ui.needs.setup.9b72d1aa": "يحتاج إلى إعداد",
  "tenant.ui.completed.exports.6cf3c8c1": "الصادرات المكتملة",
  "tenant.ui.locked.periods.2a1e7d72": "الفترات المغلقة",
  "tenant.health.ready": "جاهز",
  "tenant.health.configured": "مهيأ",
  "tenant.health.available": "متاح",
  "tenant.health.blocked": "محظور",
  "tenant.health.needsConfiguration": "يحتاج إلى تهيئة",
  "tenant.health.needsSetup": "يحتاج إلى إعداد",
  "tenant.health.notEnabled": "غير مفعل",
  "tenant.health.notConfigured": "غير مهيأ",
  "tenant.health.checking": "جار التحقق",
  "tenant.health.completedExports": "الصادرات المكتملة",
  "tenant.health.lockedPeriods": "الفترات المغلقة",
  "tenant.health.activeEmployees": "الموظفون النشطون",
  "tenant.health.assignedPolicies": "السياسات المعينة",
  "tenant.health.configuredOffices": "المكاتب المهيأة",
  "tenant.health.configuredShifts": "المناوبات المهيأة",
  "tenant.health.generatePayrollExportBeforeClosing": "أنشئ تصديرًا للرواتب قبل إغلاق فترة.",
  "tenant.health.generatePayrollExportBeforeLocking": "أنشئ تصديرًا للرواتب قبل إغلاق الشهر الأول.",
};


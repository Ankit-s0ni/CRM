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
  "tenant.navigation.dashboard": "لوحة المعلومات",
  "tenant.navigation.employees": "الموظفون",
  "tenant.navigation.modules": "الوحدات",
  "tenant.navigation.reports": "التقارير",
  "tenant.navigation.settings": "الإعدادات",
  "tenant.navigation.settingsHome": "الصفحة الرئيسية للإعدادات",
  "tenant.localization.title": "اللغة والتوطين",
};

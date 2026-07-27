import "server-only";

import { cookies, headers } from "next/headers";
import type { AppLanguage } from "./routing";

const NAMESPACES = [
  "common",
  "tenant-shell",
  "tenant-navigation",
  "tenant-dashboard",
  "attendance-status",
  "errors",
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
  if (!workspace) return null;

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
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: LocalizationBootstrap | null;
    };
    return payload.data ?? null;
  } catch {
    return null;
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

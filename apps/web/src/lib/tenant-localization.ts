"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth-store";
import type { AppLanguage } from "@/i18n/routing";
import { tenantUiKeyByDefaultMessage } from "@/i18n/generated-tenant-ui-keys";

export type TextDirection = "ltr" | "rtl";

export function useTenantLocalization() {
  const locale = useLocale() as AppLanguage;
  const translate = useTranslations();
  const formatter = useFormatter();
  const localization = useAuthStore((state) => state.user?.localization);

  return {
    locale,
    direction: (locale === "ar" ? "rtl" : "ltr") as TextDirection,
    enabledLanguages: localization?.enabledLanguages ?? ["en"],
    allowUserPreference: localization?.allowUserPreference ?? false,
    ready: true,
    t: (
      key: string,
      fallback: string,
      values?: Record<string, string | number>,
    ) =>
      translate.has(key)
        ? translate(key, values)
        : interpolate(fallback, values),
    tText: (
      fallback: string,
      values?: Record<string, string | number>,
    ) => {
      const key = tenantUiKeyByDefaultMessage[fallback];
      return key && translate.has(key)
        ? translate(key, values)
        : interpolate(fallback, values);
    },
    formatDate: (
      value: Date | string,
      options?: Intl.DateTimeFormatOptions,
    ) =>
      formatter.dateTime(
        new Date(value),
        options as Parameters<typeof formatter.dateTime>[1],
      ),
    formatNumber: (
      value: number,
      options?: Intl.NumberFormatOptions,
    ) =>
      formatter.number(
        value,
        options as Parameters<typeof formatter.number>[1],
      ),
    formatCurrency: (value: number, currency?: string) =>
      formatter.number(value, {
        style: "currency",
        currency: currency ?? localization?.currency ?? "OMR",
      }),
    formatTime: (value: Date | string) =>
      formatter.dateTime(new Date(value), {
        hour: "2-digit",
        minute: "2-digit",
      }),
  };
}

function interpolate(
  message: string,
  values?: Record<string, string | number>,
) {
  if (!values) return message;
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (match, name) =>
    values[name] === undefined ? match : String(values[name]),
  );
}

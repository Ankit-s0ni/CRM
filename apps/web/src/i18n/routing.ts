import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: false,
});

export type AppLanguage = (typeof routing.locales)[number];

export function isAppLanguage(value: string): value is AppLanguage {
  return routing.locales.includes(value as AppLanguage);
}

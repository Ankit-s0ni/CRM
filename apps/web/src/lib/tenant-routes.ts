import type { AppLanguage } from "@/i18n/routing";

const LANGUAGE_PREFIX = /^\/(en|ar)(?=\/|$)/;

export function languageFromPathname(
  pathname: string,
): AppLanguage | null {
  const match = pathname.match(LANGUAGE_PREFIX);
  return (match?.[1] as AppLanguage | undefined) ?? null;
}

export function stripLanguagePrefix(pathname: string) {
  const stripped = pathname.replace(LANGUAGE_PREFIX, "");
  return stripped || "/";
}

export function replacePathLanguage(
  pathname: string,
  language: AppLanguage,
) {
  return `/${language}${stripLanguagePrefix(pathname)}`;
}

export function localizedTenantPath(
  path: string,
  language: AppLanguage,
) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return replacePathLanguage(normalized, language);
}

export function safeLocalizedNextPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return languageFromPathname(value) && stripLanguagePrefix(value).startsWith("/app")
    ? value
    : null;
}

export function resolveTenantLoginDestination(input: {
  nextPath?: string | null;
  savedLanguage?: string | null;
  defaultLanguage: AppLanguage;
  enabledLanguages: AppLanguage[];
  onboardingCompletedAt?: string | null;
}) {
  const safeNext = safeLocalizedNextPath(input.nextPath);
  const nextLanguage = safeNext
    ? languageFromPathname(safeNext)
    : null;
  if (safeNext && nextLanguage && input.enabledLanguages.includes(nextLanguage)) {
    return safeNext;
  }

  const savedLanguage =
    input.savedLanguage === "en" || input.savedLanguage === "ar"
      ? input.savedLanguage
      : null;
  const language =
    savedLanguage && input.enabledLanguages.includes(savedLanguage)
      ? savedLanguage
      : input.defaultLanguage;
  return localizedTenantPath("/app", language);
}

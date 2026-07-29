import type { LocaleDirection } from '@prisma/client';

export const SUPPORTED_LOCALES = ['en', 'ar', 'ar-OM', 'ar-AE'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const PUBLIC_LANGUAGES = ['en', 'ar'] as const;
export type PublicLanguage = (typeof PUBLIC_LANGUAGES)[number];

export const REQUIRED_LOCALIZATION_NAMESPACES = [
  'common',
  'tenant-shell',
  'tenant-navigation',
  'tenant-dashboard',
  'attendance-status',
  'errors',
] as const;

export const LOCALE_REGISTRY: Record<
  SupportedLocale,
  {
    displayName: string;
    nativeName: string;
    direction: LocaleDirection;
    parentLocale: SupportedLocale | null;
  }
> = {
  en: {
    displayName: 'English',
    nativeName: 'English',
    direction: 'LTR',
    parentLocale: null,
  },
  ar: {
    displayName: 'Arabic',
    nativeName: 'العربية',
    direction: 'RTL',
    parentLocale: 'en',
  },
  'ar-OM': {
    displayName: 'Arabic (Oman)',
    nativeName: 'العربية (عُمان)',
    direction: 'RTL',
    parentLocale: 'ar',
  },
  'ar-AE': {
    displayName: 'Arabic (UAE)',
    nativeName: 'العربية (الإمارات)',
    direction: 'RTL',
    parentLocale: 'ar',
  },
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function isPublicLanguage(value: string): value is PublicLanguage {
  return PUBLIC_LANGUAGES.includes(value as PublicLanguage);
}

export function publicLanguageForLocale(
  locale?: string | null,
): PublicLanguage {
  return locale?.startsWith('ar') ? 'ar' : 'en';
}

export function normalizeEnabledLanguages(locales: string[]): PublicLanguage[] {
  const languages = new Set(
    locales.map((locale) => publicLanguageForLocale(locale)),
  );
  return PUBLIC_LANGUAGES.filter((language) => languages.has(language));
}

export function resolveCatalogLocale(
  language: PublicLanguage,
  regionalLocale: string,
): SupportedLocale {
  if (language === 'en') return 'en';
  return isSupportedLocale(regionalLocale) && regionalLocale.startsWith('ar')
    ? regionalLocale
    : 'ar';
}

export function localeFallbackChain(locale: SupportedLocale) {
  if (locale === 'en') return ['en'] as SupportedLocale[];
  if (locale === 'ar') return ['en', 'ar'] as SupportedLocale[];
  return ['en', 'ar', locale] as SupportedLocale[];
}

export function regionalLocaleForCountry(countryCode?: string | null) {
  if (countryCode === 'OM') return 'ar-OM' as const;
  if (countryCode === 'AE') return 'ar-AE' as const;
  return 'ar' as const;
}

export function extractPlaceholders(value: string) {
  return [
    ...new Set(
      [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
}

export function assertMatchingPlaceholders(source: string, translated: string) {
  const expected = extractPlaceholders(source);
  const received = extractPlaceholders(translated);
  if (
    expected.length !== received.length ||
    expected.some((name, index) => name !== received[index])
  ) {
    return { expected, received };
  }
  return null;
}

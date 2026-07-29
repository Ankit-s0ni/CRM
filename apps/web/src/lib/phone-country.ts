import { getCountries, type CountryCode } from "libphonenumber-js";

const SUPPORTED_PHONE_COUNTRIES = new Set(getCountries());
const TIMEZONE_COUNTRIES: Readonly<Record<string, CountryCode>> = {
  "America/New_York": "US",
  "Asia/Baghdad": "IQ",
  "Asia/Bahrain": "BH",
  "Asia/Calcutta": "IN",
  "Asia/Dacca": "BD",
  "Asia/Dhaka": "BD",
  "Asia/Dubai": "AE",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Kuwait": "KW",
  "Asia/Muscat": "OM",
  "Asia/Qatar": "QA",
  "Asia/Riyadh": "SA",
  "Europe/London": "GB",
};

export function phoneCountryForTenant({
  timezone,
  locale,
  fallback = "IN",
}: {
  timezone?: string | null;
  locale?: string | null;
  fallback?: CountryCode;
}): CountryCode {
  const timezoneCountry = timezone
    ? TIMEZONE_COUNTRIES[timezone.trim()]
    : undefined;
  if (timezoneCountry) return timezoneCountry;

  if (locale) {
    try {
      const region = new Intl.Locale(locale).region as CountryCode | undefined;
      if (region && SUPPORTED_PHONE_COUNTRIES.has(region)) return region;
    } catch {
      // Invalid legacy locales fall through to the safe product default.
    }
  }

  return fallback;
}

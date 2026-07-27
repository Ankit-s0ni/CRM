import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { getTenantLocalizationBootstrap, nestMessages } from "./catalog";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const bootstrap = await getTenantLocalizationBootstrap(locale);

  return {
    locale,
    messages: nestMessages(bootstrap?.catalog.messages ?? {}),
  };
});

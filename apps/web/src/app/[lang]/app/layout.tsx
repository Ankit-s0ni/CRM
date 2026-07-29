import { hasLocale } from "next-intl";
import { TenantShell } from "@/shared/layouts/tenant-shell";
import { TenantLanguagePolicyGate } from "@/shared/layouts/tenant-language-policy-gate";
import { getTenantLocalizationBootstrap } from "@/i18n/catalog";
import { routing } from "@/i18n/routing";

export default async function TenantAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const language = hasLocale(routing.locales, lang)
    ? lang
    : routing.defaultLocale;
  const bootstrap = await getTenantLocalizationBootstrap(language);
  const defaultLanguage =
    bootstrap?.policy.defaultLanguage ?? routing.defaultLocale;
  const enabledLanguages =
    bootstrap?.policy.enabledLanguages ?? routing.locales;

  return (
    <TenantLanguagePolicyGate
      defaultLanguage={defaultLanguage}
      enabledLanguages={[...enabledLanguages]}
    >
      <TenantShell>{children}</TenantShell>
    </TenantLanguagePolicyGate>
  );
}

"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLanguage } from "@/i18n/routing";

export function TenantLanguagePolicyGate({
  children,
  defaultLanguage,
  enabledLanguages,
}: {
  children: React.ReactNode;
  defaultLanguage: AppLanguage;
  enabledLanguages: AppLanguage[];
}) {
  const language = useLocale() as AppLanguage;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const allowed = enabledLanguages.includes(language);

  useEffect(() => {
    if (allowed) return;
    document.cookie = `deltcrm-language=${defaultLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const query = searchParams.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, {
      locale: defaultLanguage,
    });
  }, [
    allowed,
    defaultLanguage,
    pathname,
    router,
    searchParams,
  ]);

  return allowed ? children : null;
}

"use client";

import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLanguage } from "@/i18n/routing";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, enabledLanguages } = useTenantLocalization();

  if (enabledLanguages.length <= 1) return null;

  const isEn = locale === "en";
  const targetLanguage: AppLanguage = isEn ? "ar" : "en";

  const handleToggle = () => {
    const query = searchParams.toString();
    document.cookie = `deltcrm-language=${targetLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.replace(`${pathname}${query ? `?${query}` : ""}`, {
      locale: targetLanguage,
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isEn ? "Switch to Arabic" : "Switch to English"}
      title={isEn ? "Switch to Arabic" : "Switch to English"}
      dir="ltr"
      className={cn(
        "inline-flex h-9 items-center rounded-[6px] border border-border bg-card p-1",
        "shadow-sm transition hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <span
        className={cn(
          "grid h-7 min-w-10 place-items-center rounded-[5px] px-3 text-xs font-semibold transition",
          isEn
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-card hover:text-foreground",
        )}
      >
        EN
      </span>
      <span
        className={cn(
          "grid h-7 min-w-10 place-items-center rounded-[5px] px-3 text-xs font-semibold transition",
          !isEn
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-card hover:text-foreground",
        )}
      >
        AR
      </span>
    </button>
  );
}

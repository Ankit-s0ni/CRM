"use client";

import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLanguage } from "@/i18n/routing";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { cn } from "@/lib/utils";

function UkFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-4 shrink-0 rounded-full shadow-2xs", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="16" fill="#012169" />
      <path
        d="M0 0 L32 32 M32 0 L0 32"
        stroke="#FFFFFF"
        strokeWidth="5"
        clipPath="inset(0 round 16px)"
      />
      <path
        d="M0 0 L16 16 M32 0 L16 16 M0 32 L16 16 M32 32 L16 16"
        stroke="#C8102E"
        strokeWidth="2"
        clipPath="inset(0 round 16px)"
      />
      <path
        d="M16 0 V32 M0 16 H32"
        stroke="#FFFFFF"
        strokeWidth="9"
        clipPath="inset(0 round 16px)"
      />
      <path
        d="M16 0 V32 M0 16 H32"
        stroke="#C8102E"
        strokeWidth="5.5"
        clipPath="inset(0 round 16px)"
      />
    </svg>
  );
}

function OmanFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-4 shrink-0 rounded-full shadow-2xs", className)}
      aria-hidden="true"
    >
      {/* 3 Horizontal stripes clipped to circle */}
      <g clipPath="inset(0 round 16px)">
        <rect x="0" y="0" width="32" height="11" fill="#FFFFFF" />
        <rect x="0" y="10.5" width="32" height="11" fill="#DB162F" />
        <rect x="0" y="21" width="32" height="11" fill="#007A3D" />
        {/* Left vertical red stripe */}
        <rect x="0" y="0" width="11" height="32" fill="#DB162F" />

        {/* National Emblem (Khanjar & Swords) */}
        <g transform="translate(5.5, 6.5) scale(0.35)">
          <path
            d="M -7 -7 L 7 7 M 7 -7 L -7 7"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="-7" cy="-7" r="1.2" fill="#FFFFFF" />
          <circle cx="7" cy="-7" r="1.2" fill="#FFFFFF" />
          <path
            d="M -2.2 -5.5 L 2.2 -5.5 L 1.2 -2.5 L -1.2 -2.5 Z"
            fill="#FFFFFF"
          />
          <path
            d="M -1.8 -2.5 C -1.8 1.5 2 3.5 2 6 C 2 7.8 0.5 8.8 -1.5 9.2 C 0.2 8.2 0.7 7 0.7 5.5 C 0.7 3.5 -0.8 -0.5 -1.8 -2.5 Z"
            fill="#FFFFFF"
          />
          <ellipse
            cx="0"
            cy="1.2"
            rx="3"
            ry="1.1"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.9"
          />
        </g>
      </g>
    </svg>
  );
}

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
      title={
        isEn
          ? "Switch to Arabic (Oman) - العربية"
          : "Switch to English"
      }
      dir="ltr"
      className={cn(
        "group inline-flex h-9 items-center rounded-full p-1",
        "bg-surface-variant border border-outline-variant/60",
        "transition-all duration-200 ease-in-out hover:border-outline",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "cursor-pointer select-none",
        className,
      )}
    >
      {/* English Segment */}
      <span
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition-all duration-200",
          isEn
            ? "bg-surface text-on-surface shadow-xs border border-outline-variant/40"
            : "text-on-surface-variant hover:text-on-surface opacity-75 hover:opacity-100",
        )}
      >
        <UkFlag />
        <span>EN</span>
      </span>

      {/* Arabic (Omani) Segment */}
      <span
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition-all duration-200",
          !isEn
            ? "bg-surface text-on-surface shadow-xs border border-outline-variant/40"
            : "text-on-surface-variant hover:text-on-surface opacity-75 hover:opacity-100",
        )}
      >
        <OmanFlag />
        <span>AR</span>
      </span>
    </button>
  );
}

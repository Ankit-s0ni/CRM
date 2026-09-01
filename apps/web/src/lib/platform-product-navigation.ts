"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export type PlatformNavigationItem = {
  key: string;
  hrefTemplate: `/{locale}/app${string}`;
  requiredProduct?: "HRMS" | "MAIL" | "POS";
};

export function resolvePlatformNavigationHref(
  hrefTemplate: PlatformNavigationItem["hrefTemplate"],
  locale: "en" | "ar",
) {
  const path = hrefTemplate.replace("{locale}", locale);
  if (path === `/${locale}/app/tms` || path.startsWith(`/${locale}/app/tms/`)) {
    const origin = process.env.NEXT_PUBLIC_TMS_WEB_ORIGIN || "http://localhost:4032";
    return new URL(path, origin).toString();
  }
  return path;
}

export function usePlatformProductNavigation(enabled = true) {
  const [items, setItems] = useState<PlatformNavigationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    apiClient
      .get<{ items: PlatformNavigationItem[] }>(
        "/product-integration/navigation?client=platform-shell-v2",
      )
      .then(({ data }) => {
        if (active) setItems(data.items);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return { items, loaded };
}

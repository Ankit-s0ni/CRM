"use client";

import { useTheme } from "@/shared/components/theme-provider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <select
      id="theme-select"
      value={theme}
      onChange={(event) =>
        setTheme(event.target.value as "current" | "monochrome")
      }
      aria-label="Select theme"
      className="hidden h-[34px] w-[118px] shrink-0 rounded-md border border-border bg-card px-2 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/20 md:block"
    >
      <option value="monochrome">Theme 2</option>
      <option value="current">Theme 1</option>
    </select>
  );
}

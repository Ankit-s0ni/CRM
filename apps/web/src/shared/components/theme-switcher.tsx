"use client";

import { useTheme } from "@/shared/components/theme-provider";
import type { Theme } from "@/shared/components/theme-provider";

const themeOptions: Array<{ value: Theme; label: string }> = [
  { value: "default", label: "Electric Blue" },
  { value: "editorial", label: "Vedant Editorial" },
  { value: "charcoal", label: "Charcoal" },
  { value: "navy", label: "Corporate Navy" },
  { value: "emerald", label: "Emerald Green" },
  { value: "teal", label: "Vibrant Teal" },
  { value: "crimson", label: "Crimson Red" },
  { value: "monochrome", label: "Monochrome" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <select
      id="theme-select"
      value={theme}
      onChange={(event) => setTheme(event.target.value as Theme)}
      aria-label="Select theme"
      className="h-10 w-36 shrink-0 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/20"
    >
      {themeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

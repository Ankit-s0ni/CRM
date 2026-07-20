"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="theme-select" className="text-xs font-medium text-outline">Theme</label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
        className="h-8 rounded-md border border-outline-variant bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
      >
        <option value="default">Electric Blue</option>
        <option value="charcoal">Charcoal</option>
        <option value="navy">Corporate Navy</option>
        <option value="emerald">Emerald Green</option>
        <option value="teal">Vibrant Teal</option>
        <option value="crimson">Crimson Red</option>
        <option value="monochrome">Monochrome</option>
      </select>
    </div>
  );
}

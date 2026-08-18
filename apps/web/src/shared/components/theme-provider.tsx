"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

export type Theme =
  | "default"
  | "editorial"
  | "charcoal"
  | "navy"
  | "emerald"
  | "teal"
  | "crimson"
  | "monochrome";

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: "default",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);
const THEME_CHANGE_EVENT = "deltcrm-theme-change";
const themes = new Set<Theme>([
  "default",
  "editorial",
  "charcoal",
  "navy",
  "emerald",
  "teal",
  "crimson",
  "monochrome",
]);

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

function readTheme(storageKey: string, defaultTheme: Theme) {
  const storedTheme = localStorage.getItem(storageKey);
  // Preserve the value used by Vedant's first theme implementation.
  if (storedTheme === "current") return "editorial";
  return themes.has(storedTheme as Theme)
    ? (storedTheme as Theme)
    : defaultTheme;
}

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;

  if (theme === "default") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "default",
  storageKey = "liqaa-ui-theme",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    () => readTheme(storageKey, defaultTheme),
    () => defaultTheme,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (nextTheme: Theme) => {
      applyTheme(nextTheme);
      localStorage.setItem(storageKey, nextTheme);
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
